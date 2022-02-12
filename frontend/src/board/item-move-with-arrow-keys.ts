import * as L from "lonna"
import { connectionRect, resolveEndpoint } from "../../../common/src/connection-utils"
import { Board, BOARD_ITEM_BORDER_MARGIN } from "../../../common/src/domain"
import { Rect } from "../../../common/src/geometry"
import { Dispatch } from "../store/board-store"
import { BoardFocus } from "./board-focus"
import { findSelectedItemsAndConnections } from "./item-cut-copy-paste"
import { installKeyboardShortcut } from "./keyboard-shortcuts"

function updatePosition<T extends Rect>(board: Board, item: T, dx: number, dy: number): T {
    const margin = BOARD_ITEM_BORDER_MARGIN
    return {
        ...item,
        x: Math.min(Math.max(item.x + dx, margin), board.width - item.width - margin),
        y: Math.min(Math.max(item.y + dy, margin), board.height - item.height - margin),
    }
}

function moveItem<T extends Rect>(board: Board, item: T, key: string, shiftKey: boolean, altKey: boolean): T {
    const stepSize = shiftKey ? 10 : altKey ? 0.1 : 1
    switch (key) {
        case "ArrowLeft":
            return updatePosition(board, item, -stepSize, 0)
        case "ArrowRight":
            return updatePosition(board, item, stepSize, 0)
        case "ArrowUp":
            return updatePosition(board, item, 0, -stepSize)
        case "ArrowDown":
            return updatePosition(board, item, 0, stepSize)
    }
    return item
}

export function itemMoveWithArrowKeysHandler(board: L.Property<Board>, dispatch: Dispatch, focus: L.Atom<BoardFocus>) {
    installKeyboardShortcut(
        (e) => ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key),
        (e) => {
            const currentBoard = board.get()
            const itemsAndConnections = findSelectedItemsAndConnections(focus.get(), currentBoard)
            if (itemsAndConnections.items.length > 0 || itemsAndConnections.connections.length > 0) {
                const movedItems = itemsAndConnections.items.map((item) =>
                    moveItem(currentBoard, item, e.key, e.shiftKey, e.altKey),
                )
                const movedConnections = itemsAndConnections.connections.map((connection) => {
                    const rect = connectionRect(currentBoard)(connection)
                    const movedRect = moveItem(currentBoard, rect, e.key, e.shiftKey, e.altKey)
                    const xDiff = movedRect.x - rect.x
                    const yDiff = movedRect.y - rect.y
                    const startPoint = resolveEndpoint(connection.from, currentBoard)
                    return { id: connection.id, x: startPoint.x + xDiff, y: startPoint.y + yDiff }
                })
                dispatch({
                    action: "item.move",
                    boardId: currentBoard.id,
                    items: movedItems,
                    connections: movedConnections,
                })
            }
        },
    )
}
