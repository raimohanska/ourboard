import { componentScope } from "harmaja"
import * as L from "lonna"
import { Id } from "../../../common/src/domain"
import { Dispatch } from "../store/board-store"
import { BoardFocus, getSelectedIds } from "./board-focus"
import { installKeyboardShortcut, plainKey } from "./keyboard-shortcuts"

export function itemDeleteHandler(boardId: Id, dispatch: Dispatch, focus: L.Property<BoardFocus>) {
    installKeyboardShortcut(plainKey("Delete", "Backspace"), () => {
        const f = focus.get()
        if (f.status === "connection-selected") {
            dispatch({ action: "connection.delete", connectionId: f.id, boardId })
            return
        }

        const itemIds = [...getSelectedIds(focus.get())]
        if (itemIds.length) {
            dispatch({ action: "item.delete", boardId, itemIds })
        }
    })
}
