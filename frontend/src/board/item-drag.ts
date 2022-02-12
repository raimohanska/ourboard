import * as L from "lonna"
import { Board, Connection, getConnection, Item } from "../../../common/src/domain"
import { getItem } from "../../../common/src/domain"
import { BoardCoordinateHelper } from "./board-coordinates"
import { BoardFocus, getSelectedItemIds } from "./board-focus"
import { Coordinates } from "../../../common/src/geometry"
import { emptySet } from "../../../common/src/sets"

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
    onlyWhenSelected: boolean,
    doWhileDragging: (
        b: Board,
        items: { current: Item; dragStartPosition: Item }[],
        connections: { current: Connection; dragStartPosition: Connection }[],
        xDiff: number,
        yDiff: number,
    ) => void,
    doOnDrop?: (b: Board, current: Item[]) => void,
) {
    let dragStart: DragEvent | null = null
    let dragStartPositions: Board
    let currentPos: { x: number; y: number } | null = null

    const dragEnabled = onlyWhenSelected ? L.view(focus, (f) => getSelectedItemIds(f).has(id)) : L.constant(true)

    const onDragStart = (e: DragEvent) => {
        const f = focus.get()
        e.stopPropagation()
        e.dataTransfer?.setDragImage(DND_GHOST_HIDING_IMAGE, 0, 0)
        if (f.status === "dragging") {
            if (!f.itemIds.has(id)) {
                focus.set({ status: "dragging", itemIds: new Set([id]), connectionIds: emptySet() })
            }
        } else if (f.status === "selected" && f.itemIds.has(id)) {
            focus.set({ status: "dragging", itemIds: f.itemIds, connectionIds: f.connectionIds })
        } else {
            focus.set({ status: "dragging", itemIds: new Set([id]), connectionIds: emptySet() })
        }

        dragStart = e
        dragStartPositions = board.get()
    }

    const onDrag = (e: DragEvent) => {
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
        const items = [...f.itemIds].map((id) => {
            const current = b.items[id]
            const dragStartPosition = dragStartPositions.items[id]
            if (!current || !dragStartPosition) throw Error("Item not found: " + id)
            return {
                current,
                dragStartPosition,
            }
        })
        const connections = [...f.connectionIds].map((id) => {
            const current = getConnection(b)(id)
            const dragStartPosition = getConnection(dragStartPositions)(id)
            if (!current || !dragStartPosition) throw Error("Connection not found: " + id)
            return { current, dragStartPosition }
        })
        doWhileDragging(b, items, connections, xDiff, yDiff)
    }

    const onDragEnd = (e: DragEvent) => {
        e.stopPropagation()
        focus.modify((f) => {
            if (f.status !== "dragging") {
                return f
            }
            if (doOnDrop) {
                const b = board.get()
                const items = [...f.itemIds].map(getItem(b))
                doOnDrop(b, items)
            }
            currentPos = null
            return { status: "selected", itemIds: f.itemIds, connectionIds: f.connectionIds }
        })
    }

    dragEnabled.forEach((enabled) => {
        if (enabled) {
            elem.addEventListener("dragstart", onDragStart)
            elem.addEventListener("drag", onDrag)
            elem.addEventListener("dragend", onDragEnd)
        } else {
            elem.removeEventListener("dragstart", onDragStart)
            elem.removeEventListener("drag", onDrag)
            elem.removeEventListener("dragend", onDragEnd)
        }
    })
}
