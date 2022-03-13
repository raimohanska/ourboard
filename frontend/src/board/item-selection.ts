import * as L from "lonna"
import { Board, Connection, ItemType } from "../../../common/src/domain"
import { emptySet, toggleInSet } from "../../../common/src/sets"
import { Dispatch } from "../store/board-store"
import { BoardCoordinateHelper } from "./board-coordinates"
import { BoardFocus, getSelectedConnectionIds, getSelectedItemIds } from "./board-focus"
import { isConnectionAttachmentPoint, startConnecting } from "./item-connect"
import { ToolController } from "./tool-selection"
import { isSingleTouch } from "./touchScreen"

export function itemSelectionHandler(
    id: string,
    type: ItemType,
    focus: L.Atom<BoardFocus>,
    toolController: ToolController,
    board: L.Property<Board>,
    coordinateHelper: BoardCoordinateHelper,
    latestConnection: L.Property<Connection | null>,
    dispatch: Dispatch,
) {
    const itemFocus = L.view(focus, (f) => {
        if (f.status === "none" || f.status === "adding" || f.status === "connection-adding") return "none"
        if (f.status === "selected") return f.itemIds.has(id) ? "selected" : "none"
        if (f.status === "dragging") return f.itemIds.has(id) ? "dragging" : "none"
        if (f.status === "editing") return f.itemId === id ? "editing" : "none"
        return "none"
    })

    const selected = L.view(itemFocus, (s) => s !== "none")

    function onTouchStart(e: JSX.TouchEvent) {
        if (isSingleTouch(e)) {
            onClick(e)
        }
    }
    function onClick(e: JSX.MouseEvent | JSX.TouchEvent) {
        const f = focus.get()
        const selectedIds = getSelectedItemIds(f)
        const tool = toolController.tool.get()
        if (tool === "connect") {
            const item = board.get().items[id]
            const point = coordinateHelper.currentBoardCoordinates.get()
            const from = isConnectionAttachmentPoint(point, item)
                ? item
                : coordinateHelper.currentBoardCoordinates.get()
            startConnecting(board, coordinateHelper, latestConnection, dispatch, toolController, focus, from)
            e.stopPropagation()
        } else if (e.shiftKey && (f.status === "selected" || f.status === "editing")) {
            focus.set({
                status: "selected",
                itemIds: toggleInSet(id, selectedIds),
                connectionIds: getSelectedConnectionIds(f),
            })
        } else if (f.status === "none") {
            focus.set({ status: "selected", itemIds: new Set([id]), connectionIds: emptySet() })
        } else if ((f.status === "selected" || f.status === "editing") && !selectedIds.has(id)) {
            focus.set({ status: "selected", itemIds: new Set([id]), connectionIds: emptySet() })
        } else if (f.status === "selected" && (type === "note" || type === "text")) {
            focus.set({ status: "editing", itemId: id })
        }
    }

    return {
        itemFocus,
        selected,
        onClick,
        onTouchStart: onTouchStart,
    }
}
