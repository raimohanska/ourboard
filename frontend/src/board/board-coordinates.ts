import { componentScope } from "harmaja"
import * as _ from "lodash"
import * as L from "lonna"
import { add, Coordinates, origin, subtract } from "../../../common/src/geometry"
import { BoardZoom } from "./board-scroll-and-zoom"
import { onSingleTouch } from "./touchScreen"

const newCoordinates = (x: number, y: number): Coordinates => {
    return { x, y }
}

// HTML client coordinates: relative to viewport
export type PageCoordinates = Coordinates
// Board coordinates used in the domain objects: in em unit, from board top left corner.
export type BoardCoordinates = Coordinates

export type BoardCoordinateHelper = ReturnType<typeof boardCoordinateHelper>

export function boardCoordinateHelper(
    containerElem: L.Property<HTMLElement | null>,
    scrollElem: L.Property<HTMLElement | null>,
    boardElem: L.Property<HTMLElement | null>,
    zoom: L.Property<BoardZoom>,
) {
    const quickZoom = L.view(zoom, "quickZoom")

    function pxToEm(px: number) {
        return px / baseFontSize() / quickZoom.get()
    }

    function emToPagePx(em: number) {
        return em * baseFontSize() * quickZoom.get()
    }

    function emToBoardPx(em: number) {
        return em * baseFontSize()
    }

    function baseFontSize() {
        const e = boardElem.get()
        return e ? parseFloat(getComputedStyle(e).fontSize) : 10
    }

    function coordDiff(a: Coordinates, b: Coordinates) {
        return newCoordinates(a.x - b.x, a.y - b.y)
    }

    function getBoardAbsolutePosition() {
        const b = boardElem.get()
        return b ? offset(b) : origin
    }

    function offset(el: HTMLElement): Coordinates {
        let o = { x: el.offsetLeft, y: el.offsetTop }

        if (el.parentElement) {
            return add(o, offset(el.parentElement))
        }
        return o
    }

    function pageToPixelCoordinates(pp: PageCoordinates) {
        return subtract(pp, getBoardAbsolutePosition())
    }

    function pageToBoardCoordinates(pageCoords: PageCoordinates): Coordinates {
        const pixelCoords = pageToPixelCoordinates(pageCoords)
        const scrollEl = scrollElem.get()
        if (scrollEl === null) {
            return origin // Not the smartest move
        }

        // Use offsetLeft/offsetTop instead of getBoundingClientRect for getting board position
        // because drag-to-scroll uses CSS translate while dragging and we don't want that to affect the calculation.

        return newCoordinates(pxToEm(pixelCoords.x + scrollEl.scrollLeft), pxToEm(pixelCoords.y + scrollEl.scrollTop))
    }

    // Page coordinates of mouse pointer
    let currentPageCoordinates = L.atom(origin)

    // Position on the viewport, with relation to the top-left corner of the board area.
    // If board is scrolled to top left corner, the top-left corner of actual board area (excluding borders) will be at (0, 0)
    let currentBoardViewPortCoordinates = L.view(currentPageCoordinates, (pp) =>
        subtract(pp, getBoardAbsolutePosition()),
    )

    function pageCoordDiffToThisPoint(coords: PageCoordinates) {
        return coordDiff(currentPageCoordinates.get(), coords)
    }

    L.view(boardElem, containerElem, (b, c) => [b, c]).forEach(([elem, container]) => {
        if (!elem || !container) {
            return
        }

        elem.addEventListener(
            "gesturestart",
            _.throttle(
                (e) => {
                    currentPageCoordinates.set({ x: e.pageX, y: e.pageY })
                },
                16,
                { leading: true, trailing: true },
            ),
        )
        elem.addEventListener(
            "dragover",
            _.throttle(
                (e) => {
                    currentPageCoordinates.set({ x: e.pageX, y: e.pageY })
                    e.preventDefault() // To disable Safari slow animation
                },
                16,
                { leading: true, trailing: true },
            ),
        )
        container.addEventListener(
            "mousemove",
            _.throttle(
                (e) => {
                    currentPageCoordinates.set({ x: e.pageX, y: e.pageY })
                },
                16,
                { leading: true, trailing: true },
            ),
        )
        container.addEventListener("touchstart", (e) => {
            onSingleTouch(e, (touch) => currentPageCoordinates.set({ x: touch.pageX, y: touch.pageY }))
        })
        container.addEventListener("touchmove", (e) => {
            onSingleTouch(e, (touch) => currentPageCoordinates.set({ x: touch.pageX, y: touch.pageY }))
        })
    })

    function scrollCursorToBoardCoordinates(coords: Coordinates) {
        const diff = subtract(coords, currentBoardCoordinates.get())
        const diffPixels = { x: emToPagePx(diff.x), y: emToPagePx(diff.y) }
        scrollElem.get()!.scrollLeft += diffPixels.x
        scrollElem.get()!.scrollTop += diffPixels.y
    }

    const scrollEvent = scrollElem.pipe(
        L.changes,
        L.flatMapLatest((el) => L.fromEvent(el, "scroll"), componentScope()),
    )
    const updateEvent = L.merge(scrollEvent, L.changes(zoom), L.changes(currentPageCoordinates))

    // Mouse position in board coordinates
    const currentBoardCoordinates = updateEvent.pipe(
        L.toStatelessProperty(() => {
            return pageToBoardCoordinates(currentPageCoordinates.get())
        }),
    )

    return {
        pageToBoardCoordinates,
        pageCoordDiffToThisPoint,
        currentBoardViewPortCoordinates,
        currentPageCoordinates,
        currentBoardCoordinates,
        boardCoordDiffFromThisPageCoordinate: (coords: PageCoordinates) =>
            coordDiff(currentBoardCoordinates.get(), pageToBoardCoordinates(coords)),
        emToPagePx,
        emToBoardPx,
        pxToEm,
        scrollCursorToBoardCoordinates,
    }
}
