import * as R from "./harmaja-router"

describe("harmaja-router", () => {
    const BOARD_ROUTE = "/board/:board"
    const ITEM_ROUTE = "/api/v1/:board/items/:item"
    const ROOT_ROUTE = "/"

    const router = R.StaticRouter({
        [BOARD_ROUTE]: ({ board }) => ({ type: "boardpage", boardId: board }),
        [ITEM_ROUTE]: ({ board, item }) => ({ type: "itempage", board, item }),
        [ROOT_ROUTE]: () => ({ type: "frontpage" }),
    })

    describe("routeByPath", () => {
        it("Non-matching path", () => {
            const match = router.routeByPath("ASDF" as any)
            expect(match).toEqual(null)
        })

        it("Match path without params", () => {
            const match = router.routeByPath("/")
            expect(match!.path).toEqual("/")
            expect(match!.result).toEqual({ type: "frontpage" })
            expect(match!.routeKey).toEqual(ROOT_ROUTE)
        })

        it("Match path with params", () => {
            let match = router.routeByPath("/board/1")
            expect(match!.path).toEqual("/board/1")
            expect(match!.result).toEqual({ type: "boardpage", boardId: "1" })

            match = router.routeByPath("/api/v1/b1/items/i1")
            expect(match!.path).toEqual("/api/v1/b1/items/i1")
            expect(match!.result).toEqual({ type: "itempage", board: "b1", item: "i1" })
        })

        it("Ignores query string", () => {
            let match = router.routeByPath("/board/1?nickname=troll")
            expect(match!.path).toEqual("/board/1?nickname=troll")
            expect(match!.result).toEqual({ type: "boardpage", boardId: "1" })
        })

        it("URI decodes path params", () => {
            const match = router.routeByPath("/board/1%20")
            expect(match!.path).toEqual("/board/1%20")
            expect(match!.result).toEqual({ type: "boardpage", boardId: "1 " })
        })

        it("Supports empty string as fallback route", () => {
            const router = R.StaticRouter({
                [ROOT_ROUTE]: () => ({ type: "frontpage" }),
                [""]: () => ({ type: "notfound" }),
            })

            let match = router.routeByPath("/")
            expect(match!.result).toEqual({ type: "frontpage" })

            match = router.routeByPath("whatever")
            expect(match!.result).toEqual({ type: "notfound" })
            expect(match!.routeKey).toEqual("")
        })
    })

    describe("routeByParams", () => {
        it("Builds path from key+params", () => {
            const match = router.routeByParams(BOARD_ROUTE, { board: "board one" })
            expect(match!.path).toEqual("/board/board%20one")
            expect(match!.result).toEqual({ type: "boardpage", boardId: "board one" })
        })

        it("Doesn't requite params when route has zero params", () => {
            const match = router.routeByParams(ROOT_ROUTE)
            expect(match!.path).toEqual("/")
        })
    })

    it("Lists route keys", () => {
        expect(router.routeKeys).toEqual([BOARD_ROUTE, ITEM_ROUTE, ROOT_ROUTE])
    })
})
