import { componentScope } from "harmaja"
import * as L from "lonna"
import * as _ from "lodash"
import { add, Coordinates, subtract, origin, multiply } from "./geometry"

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
    zoom: L.Property<{ zoom: number, quickZoom: number}>
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

    const boardAbsolutePosition = L.view(boardElem, quickZoom, (b, z) => {
        return b 
            ? offset(b, true) 
            : origin
    })

    function offset(el: HTMLElement, isBoard: boolean): Coordinates {
        let o = { x: el.offsetLeft, y: el.offsetTop }
        
        if (el.parentElement) {
            return add(o, offset(el.parentElement, false))
        }
        return o
    }

    function pageToPixelCoordinates(pp: PageCoordinates) {
        return subtract(pp, boardAbsolutePosition.get())
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
        subtract(pp, boardAbsolutePosition.get()),
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
    })

    function scrollCursorToBoardCoordinates(coords: Coordinates) {
        const diff = subtract(coords, currentBoardCoordinates.get())
        const diffPixels = { x: emToPagePx(diff.x), y: emToPagePx(diff.y) }
        scrollElem.get()!.scrollLeft += diffPixels.x
        scrollElem.get()!.scrollTop += diffPixels.y
    }

    function elementFont(element: L.Property<HTMLElement | null>): L.Property<string> {
        return L.view(element, zoom, (e, z) => { // Note: needs zoom as input, otherwise wrong result, why?
            if (!e) return "10px arial"
            const { fontFamily, fontSize } = getComputedStyle(e)
            return `${fontSize} ${fontFamily}` // Firefox returns these properties separately, so can't just use computedStyle.font
        })
    }

    const scrollEvent = scrollElem.pipe(
        L.changes,
        L.flatMapLatest((el) => L.fromEvent(el, "scroll"), componentScope()),
    )
    const updateEvent = L.merge(scrollEvent, L.changes(zoom), L.changes(quickZoom), L.changes(currentPageCoordinates))

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
        elementFont,
    }
}
