import { componentScope } from "harmaja"
import * as L from "lonna"
import * as _ from "lodash"
import { Coordinates, subtract } from "./geometry"

const newCoordinates = (x: number, y: number): Coordinates => {
    return { x, y }
}

// HTML client coordinates: relative to viewport
export type PageCoordinates = Coordinates
// Board coordinates used in the domain objects: in em unit, from board top left corner.
export type BoardCoordinates = Coordinates

export type BoardCoordinateHelper = ReturnType<typeof boardCoordinateHelper>

export function boardCoordinateHelper(
    boardElem: L.Property<HTMLElement | null>,
    scrollElem: L.Property<HTMLElement | null>,
    zoom: L.Property<number>,
) {
    let currentClientPos = L.atom({ x: 0, y: 0 })

    function pxToEm(px: number) {
        return px / baseFontSize()
    }

    function emToPx(em: number) {
        return em * baseFontSize()
    }

    function baseFontSize() {
        const e = boardElem.get()
        return e ? parseFloat(getComputedStyle(e).fontSize) : 10
    }

    function coordDiff(a: Coordinates, b: Coordinates) {
        return newCoordinates(a.x - b.x, a.y - b.y)
    }

    const boardAbsolutePosition = L.view(boardElem, (b) => ({
        offsetTop: b?.offsetTop ?? null,
        offsetLeft: b?.offsetLeft ?? null,
    }))

    function pageToBoardCoordinates(pageCoords: PageCoordinates): Coordinates {
        const scrollEl = scrollElem.get()
        const { offsetTop, offsetLeft } = boardAbsolutePosition.get()
        if (scrollEl === null || offsetTop === null || offsetLeft === null) {
            return { x: 0, y: 0 } // Not the smartest move
        }

        // Use offsetLeft/offsetTop instead of getBoundingClientRect for getting board position
        // because drag-to-scroll uses CSS translate while dragging and we don't want that to affect the calculation.

        return newCoordinates(
            pxToEm(pageCoords.x + scrollEl.scrollLeft - offsetLeft),
            pxToEm(pageCoords.y + scrollEl.scrollTop - offsetTop),
        )
    }

    function pageCoordDiffToThisPoint(coords: PageCoordinates) {
        return coordDiff(currentClientPos.get(), coords)
    }

    function getClippedCoordinate(coordinate: number, direction: "clientWidth" | "clientHeight", maxMargin: number) {
        const elem = boardElem.get()
        if (!elem) {
            return coordinate
        }
        const clientSize = elem[direction]
        const maxCoordinate = pxToEm(clientSize) - maxMargin
        return Math.max(0, Math.min(coordinate, maxCoordinate))
    }

    boardElem.forEach((elem) => {
        if (!elem) {
            return
        }
        elem.addEventListener(
            "dragover",
            _.throttle(
                (e) => {
                    currentClientPos.set({ x: e.pageX, y: e.pageY })
                    e.preventDefault() // To disable Safari slow animation
                },
                16,
                { leading: true, trailing: true },
            ),
        )
        elem.addEventListener(
            "mousemove",
            _.throttle(
                (e) => {
                    currentClientPos.set({ x: e.pageX, y: e.pageY })
                },
                16,
                { leading: true, trailing: true },
            ),
        )
    })

    function scrollCursorToBoardCoordinates(coords: Coordinates) {
        const diff = subtract(coords, currentBoardCoordinates.get())
        const diffPixels = { x: emToPx(diff.x), y: emToPx(diff.y) }
        scrollElem.get()!.scrollLeft += diffPixels.x
        scrollElem.get()!.scrollTop += diffPixels.y
        const diff2 = subtract(coords, currentBoardCoordinates.get())
        const absDiff = Math.sqrt(diff2.x * diff2.x + diff2.y * diff2.y)
    }

    function elementFont(element: L.Property<HTMLElement | null>): L.Property<string> {
        return L.view(element, zoom, (e, z) => {
            if (!e) return "10px arial"
            const { fontFamily, fontSize } = getComputedStyle(e)
            return `${fontSize} ${fontFamily}` // Firefox returns these properties separately, so can't just use computedStyle.font
        })
    }

    const scrollEvent = scrollElem.pipe(
        L.changes,
        L.flatMapLatest((el) => L.fromEvent(el, "scroll"), componentScope()),
    )
    const updateEvent = L.merge(scrollEvent, L.changes(zoom), L.changes(currentClientPos))
    const currentBoardCoordinates = updateEvent.pipe(
        L.toStatelessProperty(() => {
            return pageToBoardCoordinates(currentClientPos.get())
        }),
    )

    return {
        pageToBoardCoordinates,
        pageCoordDiffToThisPoint,
        currentPageCoordinates: currentClientPos,
        currentBoardCoordinates,
        boardCoordDiffFromThisClientPoint: (coords: PageCoordinates) =>
            coordDiff(currentBoardCoordinates.get(), pageToBoardCoordinates(coords)),
        getClippedCoordinate,
        emToPx,
        pxToEm,
        scrollCursorToBoardCoordinates,
        elementFont,
    }
}
