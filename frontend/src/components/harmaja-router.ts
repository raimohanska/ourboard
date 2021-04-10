import * as L from "lonna"
import * as PTR from "path-to-regexp"

type SplitBy<Delim extends string, Input> = Input extends `${infer First}${Delim}${infer Rest}`
    ? [First, ...SplitBy<Delim, Rest>]
    : [Input]

type SplitEach<Delim extends string, Input> = Input extends [infer Head, ...infer Tail]
    ? [...SplitBy<Delim, Head>, ...SplitEach<Delim, Tail>]
    : []

type Split<Input> = SplitEach<"/", [Input]>
type ParamsFrom<Parts> = Parts extends [infer First, ...infer Rest]
    ? First extends `:${infer Param}`
        ? { [K in Param]: string } & ParamsFrom<Rest>
        : ParamsFrom<Rest>
    : {}

export type PathParams<S extends string> = ParamsFrom<Split<S>>
type ValidPathPart<PartKey extends string> = PartKey extends `:${infer Param}` ? string : PartKey

type ValidPathFrom<Parts> = Parts extends [infer First, infer Second, ...infer Rest]
    ? First extends string // TODO: accepts empties
        ? `${ValidPathPart<First>}/${ValidPathFrom<[Second, ...Rest]>}`
        : never
    : Parts extends [infer First]
    ? First extends string // TODO: accepts empties
        ? `${ValidPathPart<First>}`
        : never
    : never
type ValidPathForKey<S extends string> = ValidPathFrom<Split<S>> & string
export type RouteHandler<Params, Result> = (params: Params) => Result
export type RouteMap<R> = {
    [Path in keyof R]: Path extends string ? RouteHandler<PathParams<Path>, R[Path]> : never
}
export type RouteKey<R> = keyof R & string
export type RouteResult<R> = ReturnType<RouteMap<R>[keyof R]>
export type RoutePath<R> = ValidPathForKey<keyof R & string>

export type RouteMatch<R> = {
    routeKey: RouteKey<R>
    path: RoutePath<R>
    result: RouteResult<R>
}

function RouteEntry<Key extends string, Result>(routeKey: Key, handler: RouteHandler<PathParams<Key>, Result>) {
    const expression = routeKey === "" ? ("(.*)" as Key) : routeKey

    const tokens = PTR.parse(expression)
    const toPath = PTR.compile(expression, { encode: encodeURIComponent })
    const match = PTR.match(expression, { decode: decodeURIComponent })
    const requiredParams = tokens.flatMap((t) => (typeof t === "string" ? [] : t.name))
    return {
        routeKey,
        toPath: (params: PathParams<any>) => {
            const paramList = Object.keys(params)
            const missing = requiredParams.filter((p) => !paramList.includes(p.toString()))
            if (missing.length > 0) throw Error("Params missing: " + missing.join(", "))
            return toPath(params)
        },
        match: (path: string) => {
            const result = match(path.split("?")[0])
            if (!result) return null
            return result.params
        },
        apply: (params: object) => (handler as any)(params),
    }
}

export function StaticRouter<R>(routes: RouteMap<R>) {
    const routeEntries = Object.fromEntries(
        Object.entries(routes).map(([routeKey, handler]) => {
            const entry = RouteEntry(routeKey, handler as any)
            return [routeKey, entry]
        }),
    )

    function routeByParams<PathKey extends RouteKey<R>>(
        routeKey: PathKey,
        params: PathParams<PathKey>,
    ): RouteMatch<R> | null
    function routeByParams<PathKey extends RouteKey<R>>(
        routeKey: {} extends PathParams<PathKey> ? PathKey : never,
    ): RouteMatch<R> | null
    function routeByParams<PathKey extends RouteKey<R>>(
        routeKey: PathKey,
        params: PathParams<PathKey> = {} as PathParams<PathKey>,
    ): RouteMatch<R> | null {
        const route = routeEntries[routeKey]
        if (!route) return null
        const result = route.apply(params)
        const path = route.toPath(params) as RoutePath<R>
        return {
            routeKey,
            path,
            result,
        }
    }

    function routeByPath(path: string): RouteMatch<R> | null {
        for (let entry of Object.values(routeEntries)) {
            const params = entry.match(path)
            if (params) {
                return {
                    routeKey: entry.routeKey as RouteKey<R>,
                    path: path as RoutePath<R>,
                    result: entry.apply(params),
                }
            }
        }
        return null
    }

    return {
        routeByParams,
        routeByPath,
        routeKeys: Object.keys(routes),
    }
}

export function ReactiveRouter<R>(routes: RouteMap<R>, scope: L.Scope) {
    const staticRouter = StaticRouter(routes)
    const navigationRequests = L.bus<RouteMatch<R>>()
    const pathFromPopstate = L.fromEvent(window, "popstate").pipe(L.map(pathFromBrowser))
    const routeRequests = L.merge(navigationRequests, pathFromPopstate)
    const route = routeRequests.pipe(L.toProperty(pathFromBrowser(), scope))

    function pathFromBrowser() {
        const path = document.location.pathname as RoutePath<R>
        const result = staticRouter.routeByPath(path)
        if (!result) throw Error(`Non-matching path ${path}. Known routes are ${staticRouter.routeKeys}`)

        return result
    }
    function navigateByParams<PathKey extends RouteKey<R>>(p: PathKey, params: PathParams<PathKey>): void
    function navigateByParams<PathKey extends RouteKey<R>>(p: {} extends PathParams<PathKey> ? PathKey : never): void
    function navigateByParams<PathKey extends RouteKey<R>>(p: PathKey, params?: PathParams<PathKey>): void {
        const result = staticRouter.routeByParams(p, params ?? ({} as PathParams<PathKey>))
        if (!result) throw Error(`Unknown route ${p}. Known routes are ${Object.keys(staticRouter.routeKeys)}`)
        navigationRequests.push(result)
    }
    function navigateByPath<Path extends RoutePath<R>>(path: Path) {
        const result = staticRouter.routeByPath(path)
        if (!result) throw Error(`Non-matching path ${path}. Known routes are ${Object.keys(staticRouter.routeKeys)}`)
        navigationRequests.push(result)
    }

    const result: L.Property<RouteResult<R>> = L.view(route, (r) => r.result)

    routeRequests.forEach((route) => {
        if (pathFromBrowser() === route.path) return
        history.pushState({}, "", route.path)
    })

    return {
        navigateByParams,
        navigateByPath,
        result,
    }
}
