import * as L from "lonna"
import { Board, ItemType } from "../../../common/src/domain"
import { toggleInSet } from "../../../common/src/sets"
import { Dispatch } from "../store/board-store"
import { BoardCoordinateHelper } from "./board-coordinates"
import { BoardFocus, getSelectedItemIds } from "./board-focus"
import { startConnecting } from "./item-connect"
import { findSelectedItems } from "./item-cut-copy-paste"
import { ToolController } from "./tool-selection"

export function itemSelectionHandler(
    id: string,
    type: ItemType,
    focus: L.Atom<BoardFocus>,
    toolController: ToolController,
    board: L.Property<Board>,
    coordinateHelper: BoardCoordinateHelper,
    dispatch: Dispatch,
) {
    const itemFocus = L.view(focus, (f) => {
        if (f.status === "none" || f.status === "adding" || f.status === "connection-adding") return "none"
        if (f.status === "selected") return f.ids.has(id) ? "selected" : "none"
        if (f.status === "dragging") return f.ids.has(id) ? "dragging" : "none"
        if (f.status === "editing") return f.id === id ? "editing" : "none"
        return "none"
    })

    const selected = L.view(itemFocus, (s) => s !== "none")

    function onClick(e: JSX.MouseEvent) {
        const f = focus.get()
        const selectedIds = getSelectedItemIds(f)
        const tool = toolController.tool.get()
        if (tool === "connect") {
            const item = board.get().items[id]
            startConnecting(board, coordinateHelper, dispatch, toolController, focus, item)
            e.stopPropagation()
        } else if (e.shiftKey && (f.status === "selected" || f.status === "editing")) {
            focus.set({ status: "selected", ids: toggleInSet(id, selectedIds) })
        } else if (f.status === "none" || f.status === "connection-selected") {
            focus.set({ status: "selected", ids: new Set([id]) })
        } else if ((f.status === "selected" || f.status === "editing") && !selectedIds.has(id)) {
            focus.set({ status: "selected", ids: new Set([id]) })
        } else if (f.status === "selected" && (type === "note" || type === "text")) {
            focus.set({ status: "editing", id })
        }
    }

    return {
        itemFocus,
        selected,
        onClick,
    }
}
