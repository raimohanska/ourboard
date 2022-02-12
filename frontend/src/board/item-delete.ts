import * as L from "lonna"
import { Id } from "../../../common/src/domain"
import { Dispatch } from "../store/board-store"
import { BoardFocus, getSelectedItemIds } from "./board-focus"
import { installKeyboardShortcut, plainKey } from "./keyboard-shortcuts"

export function itemDeleteHandler(boardId: Id, dispatch: Dispatch, focus: L.Property<BoardFocus>) {
    installKeyboardShortcut(plainKey("Delete", "Backspace"), () => {
        const f = focus.get()
        if (f.status === "connection-selected") {
            const ids = [...f.ids]
            dispatch({ action: "connection.delete", connectionId: ids, boardId })
            return
        }

        const itemIds = [...getSelectedItemIds(focus.get())]
        if (itemIds.length) {
            dispatch({ action: "item.delete", boardId, itemIds })
        }
    })
}
