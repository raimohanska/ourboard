import * as H from "harmaja"
import { componentScope } from "harmaja"
import _ from "lodash"
import * as L from "lonna"
import { BoardCoordinateHelper } from "./board-coordinates"
import * as G from "../../../common/src/geometry"
import { Board } from "../../../common/src/domain"
import { isFirefox } from "../components/browser"
import { ToolController } from "./tool-selection"

export type BoardZoom = { zoom: number; quickZoom: number }

function nonNull<A>(x: A | null | undefined): x is A {
    return !!x
}

export function boardScrollAndZoomHandler(
    board: L.Property<Board>,
    boardElement: L.Property<HTMLElement | null>,
    scrollElement: L.Property<HTMLElement | null>,
    zoom: L.Atom<BoardZoom>,
    coordinateHelper: BoardCoordinateHelper,
    toolController: ToolController,
) {
    const scrollPos = scrollElement.pipe(
        L.changes,
        L.filter(nonNull),
        L.flatMapLatest(
            (el) => L.fromEvent(el, "scroll").pipe(L.map(() => ({ x: el.scrollLeft, y: el.scrollTop }))),
            componentScope(),
        ),
        L.toProperty(G.origin as { x: number; y: number }, componentScope()),
    )

    const scrollAndZoom = L.combine(scrollPos, zoom, (s, zoom) => ({ ...s, zoom }))

    const localStorageKey = L.view(
        board,
        (b) => b.id,
        (id) => "scrollAndZoom." + id,
    )

    L.view(scrollElement, localStorageKey, (el, key) => ({ el, key }))
        .pipe(L.applyScope(componentScope()))
        .forEach(({ el, key }) => {
            if (el) {
                const storedScrollAndZoom = localStorage[key]
                if (storedScrollAndZoom) {
                    //console.log("Init position for board", key)
                    const parsed = JSON.parse(storedScrollAndZoom)
                    setTimeout(() => {
                        el.scrollTop = parsed.y
                        el.scrollLeft = parsed.x
                        zoom.set({ zoom: parsed.zoom, quickZoom: 1 })
                    }, 0) // Need to wait for first render to have correct size. Causes a little flicker.
                }
            }
        })

    scrollAndZoom.pipe(L.changes, L.debounce(100), L.applyScope(componentScope())).forEach((s) => {
        //console.log("Store position for board", localStorageKey.get())
        localStorage[localStorageKey.get()] = JSON.stringify({ ...s, zoom: s.zoom.zoom * s.zoom.quickZoom })
    })

    const changes = L.merge(
        L.fromEvent(window, "resize"),
        scrollPos.pipe(L.changes),
        L.changes(boardElement),
        L.changes(zoom),
    )

    const viewRectProp = changes.pipe(
        L.throttle(0, componentScope()), // without the throttle/delay the rects below are not set correctly yet
        L.toStatelessProperty(() => {
            const boardRect = boardElement.get()?.getBoundingClientRect()
            const viewRect = scrollElement.get()?.getBoundingClientRect()!

            if (!boardRect || !viewRect) return G.ZERO_RECT

            return {
                x: coordinateHelper.pxToEm(viewRect.x - boardRect.x),
                y: coordinateHelper.pxToEm(viewRect.y - boardRect.y),
                width: coordinateHelper.pxToEm(viewRect.width),
                height: coordinateHelper.pxToEm(viewRect.height),
            }
        }),
        L.cached(componentScope()),
    )

    // NOTE: viewRect only supports panning, i.e. setting a viewRect with different size doesn't have an effect
    const viewRect = L.atom(viewRectProp, (newRect) => {
        const boardRect = boardElement.get()?.getBoundingClientRect()!
        const viewRect = scrollElement.get()?.getBoundingClientRect()!
        const scrollX = viewRect.x - boardRect.x
        const scrollY = viewRect.y - boardRect.y

        const newX = coordinateHelper.emToBoardPx(newRect.x)
        const newY = coordinateHelper.emToBoardPx(newRect.y)

        scrollElement.get()!.scrollLeft = newX
        scrollElement.get()!.scrollTop = newY
    })

    function wheelZoomHandler(event: WheelEvent) {
        const ctrlOrCmd = event.ctrlKey || event.metaKey

        // Wheel-zoom, or two finger zoom gesture on trackpad
        if (ctrlOrCmd && event.deltaY !== 0) {
            event.preventDefault()
            const step = Math.pow(1.01, -event.deltaY * (isFirefox ? 4 : 1))
            adjustZoom((z) => z * step)
        } else {
            // If the user seems to be using a trackpad, and they haven't manually selected a tool yet,
            // Let's set the mode to 'select' as a best-effort "works like you'd expect" UX thing
            const settings = toolController.controlSettings.get()
            if (settings.defaultTool || settings.tool === "select") {
                // Don't automatically make decisions for user if they have already set tool manually,
                // Or if the select tool is already on
                return
            }

            // On Firefox event.deltaMode is 0 on trackpad, 1 on mouse. Other browsers always 0.
            // So we guess that user using trackpad if deltaMode == 0 and both deltaY/deltaX are sufficiently small (mousewheel is more coarse)
            const isTrackpad = event.deltaMode === 0 && Math.max(Math.abs(event.deltaX), Math.abs(event.deltaY)) <= 3

            if (isTrackpad) {
                toolController.tool.set("select")
            }
        }
    }

    zoom.pipe(L.changes, L.debounce(50, componentScope())).forEach((z) => {
        if (z.quickZoom !== 1 && !scaleStart) {
            zoom.set({ zoom: z.zoom * z.quickZoom, quickZoom: 1 })
        }
    })

    function adjustZoom(fn: (previous: number) => number) {
        const prevBoardCoords = coordinateHelper.currentBoardCoordinates.get()
        zoom.modify((z) => {
            return {
                // TODO: clamp total zoom
                quickZoom: _.clamp(fn(z.quickZoom), 0.2, 10),
                zoom: z.zoom,
            }
        })
        coordinateHelper.scrollCursorToBoardCoordinates(prevBoardCoords)
    }
    let scaleStart: number | null = null

    function onGestureStart(e: any) {
        e.preventDefault()
        const scale = typeof e.scale === "number" && (e.scale as number)
        if (scale) {
            scaleStart = zoom.get().quickZoom / scale
        }
    }

    function onGestureChange(e: any) {
        e.preventDefault()
        const scale = typeof e.scale === "number" && (e.scale as number)
        if (scale && scaleStart) {
            const result = scale * scaleStart
            adjustZoom(() => result)
        }
    }

    function onGestureEnd(e: any) {
        onGestureChange(e)
        scaleStart = null
    }

    H.onMount(() => {
        // have to use this for chrome: https://stackoverflow.com/questions/42101723/unable-to-preventdefault-inside-passive-event-listener
        document.addEventListener("wheel", wheelZoomHandler, { passive: false })
        document.addEventListener("gesturestart", onGestureStart)
        document.addEventListener("gesturechange", onGestureChange)
        document.addEventListener("gestureend", onGestureEnd)
    })
    H.onUnmount(() => {
        document.removeEventListener("wheel", wheelZoomHandler)
        document.removeEventListener("gesturestart", onGestureStart)
        document.removeEventListener("gesturechange", onGestureChange)
        document.removeEventListener("gestureend", onGestureChange)
    })
    return {
        viewRect,
    }
}
