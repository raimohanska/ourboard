import * as H from "harmaja"
import { componentScope } from "harmaja"
import _ from "lodash"
import * as L from "lonna"
import { BoardCoordinateHelper } from "./board-coordinates"
import * as G from "./geometry"
import { ControlSettings } from "./BoardView"
import { Board } from "../../../common/src/domain"
import { isFirefox } from "../components/browser"

export function boardScrollAndZoomHandler(
    board: L.Property<Board>,
    boardElement: L.Property<HTMLElement | null>,
    scrollElement: L.Property<HTMLElement | null>,
    zoom: L.Atom<number>,
    coordinateHelper: BoardCoordinateHelper,
    controlSettings: L.Atom<ControlSettings>,
) {
    const scrollPos = scrollElement.pipe(
        L.changes,
        L.filter((el: any) => !!el),
        L.flatMapLatest(
            (el: HTMLElement) => L.fromEvent(el, "scroll").pipe(L.map(() => ({ x: el.scrollLeft, y: el.scrollTop }))),
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
                        zoom.set(parsed.zoom)
                    }, 0) // Need to wait for first render to have correct size. Causes a little flicker.
                }
            }
        })

    scrollAndZoom.pipe(L.changes, L.debounce(100), L.applyScope(componentScope())).forEach((s) => {
        //console.log("Store position for board", localStorageKey.get())
        localStorage[localStorageKey.get()] = JSON.stringify(s)
    })

    const changes = L.merge(
        L.fromEvent(window, "resize"),
        scrollPos.pipe(L.changes),
        L.changes(boardElement),
        L.changes(zoom),
    )
    const viewRect = changes.pipe(
        L.toStatelessProperty(() => {
            const boardRect = boardElement.get()?.getBoundingClientRect()
            const viewRect = scrollElement.get()?.getBoundingClientRect()!

            if (!boardRect || !viewRect) return null

            return {
                x: coordinateHelper.pxToEm(viewRect.x - boardRect.x),
                y: coordinateHelper.pxToEm(viewRect.y - boardRect.y),
                width: coordinateHelper.pxToEm(viewRect.width),
                height: coordinateHelper.pxToEm(viewRect.height),
            }
        }),
        L.cached<G.Rect | null>(componentScope()),
    )

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
            const settings = controlSettings.get()
            if (settings.hasUserManuallySetTool || settings.tool === "select") {
                // Don't automatically make decisions for user if they have already set tool manually,
                // Or if the select tool is already on
                return
            }

            // On Firefox event.deltaMode is 0 on trackpad, 1 on mouse. Other browsers always 0.
            // So we guess that user using trackpad if deltaMode == 0 and both deltaY/deltaX are sufficiently small (mousewheel is more coarse)
            const isTrackpad = event.deltaMode === 0 && Math.max(Math.abs(event.deltaX), Math.abs(event.deltaY)) <= 3

            if (isTrackpad) {
                controlSettings.set({ ...settings, tool: "select" })
            }
        }
    }

    function adjustZoom(fn: (previous: number) => number) {
        const prevBoardCoords = coordinateHelper.currentBoardCoordinates.get()
        zoom.modify((z) => _.clamp(fn(z), 0.2, 10))
        coordinateHelper.scrollCursorToBoardCoordinates(prevBoardCoords)
    }

    let scaleBus = L.bus<number>()
    scaleBus.pipe(L.throttle(50, componentScope())).forEach((v) => adjustZoom(() => v))
    let scaleStart: number = 1

    function onGestureStart(e: any) {
        e.preventDefault()
        const scale = typeof e.scale === "number" && (e.scale as number)
        if (scale) {
            scaleStart = zoom.get() / scale
        }
    }

    function onGestureChange(e: any) {
        e.preventDefault()
        const scale = typeof e.scale === "number" && (e.scale as number)
        if (scale) {
            scaleBus.push(scale * scaleStart)
        }
    }

    H.onMount(() => {
        // have to use this for chrome: https://stackoverflow.com/questions/42101723/unable-to-preventdefault-inside-passive-event-listener
        document.addEventListener("wheel", wheelZoomHandler, { passive: false })
        document.addEventListener("gesturestart", onGestureStart)
        document.addEventListener("gesturechange", onGestureChange)
        document.addEventListener("gestureend", onGestureChange)
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
