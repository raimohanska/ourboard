import * as H from "harmaja"
import { componentScope } from "harmaja"
import _ from "lodash"
import * as L from "lonna"
import { BoardCoordinateHelper } from "./board-coordinates"
import * as G from "./geometry"
import { ControlSettings } from "./BoardView"

export function boardScrollAndZoomHandler(
    boardElement: L.Property<HTMLElement | null>,
    scrollElement: L.Property<HTMLElement | null>,
    zoom: L.Atom<number>,
    coordinateHelper: BoardCoordinateHelper,
    controlSettings: L.Atom<ControlSettings>,
) {
    const scrollEvent = scrollElement.pipe(
        L.changes,
        L.flatMapLatest((el) => L.fromEvent(el, "scroll"), componentScope()),
    )

    scrollElement.forEach((elem) => {
        if (elem) {
            if (localStorage.scrollAndZoom) {
                const parsed = JSON.parse(localStorage.scrollAndZoom)
                setTimeout(() => {
                    elem.scrollTop = parsed.y
                    elem.scrollLeft = parsed.x
                    zoom.set(parsed.zoom)
                }, 0) // Need to wait for first render to have correct size. Causes a little flicker.
            }
            const scrollPos = scrollEvent.pipe(
                L.toStatelessProperty(() => {
                    return {
                        x: elem.scrollLeft,
                        y: elem.scrollTop,
                    }
                }),
            )
            const scrollAndZoom = L.combine(scrollPos, zoom, (s, zoom) => ({ ...s, zoom }))
            scrollAndZoom
                .pipe(L.changes, L.debounce(100))
                .forEach((s) => (localStorage.scrollAndZoom = JSON.stringify(s)))
        }
    })

    const changes = L.merge(L.fromEvent(window, "resize"), scrollEvent, L.changes(boardElement), L.changes(zoom))
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
        if (event.target === boardElement.get() || boardElement.get()!.contains(event.target as Node)) {
            const ctrlOrCmd = event.ctrlKey || event.metaKey

            // Wheel-zoom, or two finger zoom gesture on trackpad
            if (ctrlOrCmd && event.deltaY !== 0) {
                event.preventDefault()
                const prevBoardCoords = coordinateHelper.currentBoardCoordinates.get()
                const step = 1.04
                zoom.modify((z) => _.clamp(event.deltaY < 0 ? z * step : z / step, 0.2, 10))
                coordinateHelper.scrollCursorToBoardCoordinates(prevBoardCoords)
            } else {
                // If the user seems to be using a trackpad, and they haven't manually configured their control mode yet,
                // Let's set the mode to 'trackpad' as a best-effort "works like you'd expect" UX thing
                const settings = controlSettings.get()
                if (settings.hasUserManuallySetMode || settings.mode === "trackpad") {
                    // Don't automatically make decisions for user if they have already set mode manually,
                    // Or if the mode is already trackpad
                    return
                }

                // On Firefox event.deltaMode is 0 on trackpad, 1 on mouse. Other browsers always 0.
                // So we guess that user using trackpad if deltaMode == 0 and both deltaY/deltaX are sufficiently small (mousewheel is more coarse)
                const isTrackpad =
                    event.deltaMode === 0 && Math.max(Math.abs(event.deltaX), Math.abs(event.deltaY)) <= 3

                if (isTrackpad) {
                    controlSettings.set({ ...settings, mode: "trackpad" })
                }
            }
        }
    }
    H.onMount(() => {
        // have to use this for chrome: https://stackoverflow.com/questions/42101723/unable-to-preventdefault-inside-passive-event-listener
        window.addEventListener("wheel", wheelZoomHandler, { passive: false })
    })
    H.onUnmount(() => {
        window.removeEventListener("wheel", wheelZoomHandler)
    })
    return {
        viewRect,
    }
}
