import * as L from "lonna"
import { Id } from "../../../common/src/domain"
import { Dispatch } from "../store/board-store"
import { BoardFocus, getSelectedConnectionIds, getSelectedItemIds } from "./board-focus"
import { installKeyboardShortcut, plainKey } from "./keyboard-shortcuts"

export function itemDeleteHandler(boardId: Id, dispatch: Dispatch, focus: L.Property<BoardFocus>) {
    installKeyboardShortcut(plainKey("Delete", "Backspace"), () => {
        const f = focus.get()
        const connectionIds = [...getSelectedConnectionIds(focus.get())]
        if (connectionIds.length) {
            dispatch({ action: "connection.delete", connectionId: connectionIds, boardId }) // TODO: make a new combined delete action
        }

        const itemIds = [...getSelectedItemIds(focus.get())]
        if (itemIds.length) {
            dispatch({ action: "item.delete", boardId, itemIds })
        }
    })
}
