import * as L from "lonna"
import { Id } from "../../../common/src/domain"
import { Dispatch } from "../store/board-store"
import { BoardFocus, getSelectedConnectionIds, getSelectedItemIds } from "./board-focus"
import { installKeyboardShortcut, plainKey } from "./keyboard-shortcuts"

export function itemDeleteHandler(boardId: Id, dispatch: Dispatch, focus: L.Property<BoardFocus>) {
    installKeyboardShortcut(plainKey("Delete", "Backspace"), () => {
        const f = focus.get()
        dispatchDeletion(boardId, f, dispatch)
    })
}

export function dispatchDeletion(boardId: Id, f: BoardFocus, dispatch: Dispatch) {
    const connectionIds = [...getSelectedConnectionIds(f)]
    const itemIds = [...getSelectedItemIds(f)]
    if (itemIds.length || connectionIds.length) {
        dispatch({ action: "item.delete", boardId, itemIds, connectionIds })
    }
}
