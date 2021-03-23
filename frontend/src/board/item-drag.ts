import { throttle } from "lodash"
import * as L from "lonna"
import { Board, Item } from "../../../common/src/domain"
import { getItem } from "../../../common/src/domain"
import { BoardCoordinateHelper } from "./board-coordinates"
import { BoardFocus } from "./board-focus"
import { Coordinates } from "./geometry"

export const DND_GHOST_HIDING_IMAGE = new Image()
// https://png-pixel.com/
DND_GHOST_HIDING_IMAGE.src =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

export function onBoardItemDrag(
    elem: HTMLElement,
    id: string,
    board: L.Property<Board>,
    focus: L.Atom<BoardFocus>,
    coordinateHelper: BoardCoordinateHelper,
    doWhileDragging: (
        b: Board,
        items: { current: Item; dragStartPosition: Item }[],
        xDiff: number,
        yDiff: number,
    ) => void,
    doOnDrop?: (b: Board, current: Item[]) => void,
) {
    let dragStart: DragEvent | null = null
    let dragStartPositions: Record<string, Item>
    let currentPos: { x: number; y: number } | null = null

    elem.addEventListener("dragstart", (e) => {
        if (e.target !== elem && (e.target as Element)?.nodeName !== "IMG") {
            // Prevent multiple drag listeners from capturing the same drag event.
            // Hack: when dragging images, the image itself is the drag target,
            // but the parent span handles the drag behavior, so make an exception for those.
            // FIXME: figure out better solution
            return
        }
        e.stopPropagation()
        e.dataTransfer?.setDragImage(DND_GHOST_HIDING_IMAGE, 0, 0)
        const f = focus.get()
        if (f.status === "dragging") {
            if (!f.ids.has(id)) {
                focus.set({ status: "dragging", ids: new Set([id]) })
            }
        } else if (f.status === "selected" && f.ids.has(id)) {
            focus.set({ status: "dragging", ids: f.ids })
        } else {
            focus.set({ status: "dragging", ids: new Set([id]) })
        }

        dragStart = e
        dragStartPositions = board.get().items
    })
    elem.addEventListener(
        "drag",
        throttle((e) => {
            if (e.target !== elem && e.target?.nodeName !== "IMG") {
                // Prevent multiple drag listeners from capturing the same drag event.
                // Hack: when dragging images, the image itself is the drag target,
                // but the parent span handles the drag behavior, so make an exception for those.
                // FIXME: figure out better solution
                return
            }

            e.stopPropagation()

            const f = focus.get()
            if (f.status !== "dragging") {
                e.preventDefault()
                return
            }
            const newPos = coordinateHelper.boardCoordDiffFromThisPageCoordinate({
                x: dragStart!.pageX,
                y: dragStart!.pageY,
            })
            if (currentPos && currentPos.x == newPos.x && currentPos.y === newPos.y) {
                return
            }
            currentPos = newPos
            const { x: xDiff, y: yDiff } = newPos

            const b = board.get()
            const items = [...f.ids].map((id) => {
                const current = b.items[id]
                const dragStartPosition = dragStartPositions[id]
                if (!current || !dragStartPosition) throw Error("Item not found: " + id)
                return {
                    current,
                    dragStartPosition,
                }
            })
            doWhileDragging(b, items, xDiff, yDiff)
        }, 50),
    )

    elem.addEventListener("dragend", (e) => {
        if (e.target !== elem) return
        e.stopPropagation()
        focus.modify((f) => {
            if (f.status !== "dragging") {
                return f
            }
            if (doOnDrop) {
                const b = board.get()
                const items = [...f.ids].map(getItem(b))
                doOnDrop(b, items)
            }
            currentPos = null
            return { status: "selected", ids: f.ids }
        })
    })
}
