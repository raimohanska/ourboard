import { Dispatch } from "../store/board-store"
import { controlKey, installKeyboardShortcut } from "./keyboard-shortcuts"

export function itemUndoHandler(dispatch: Dispatch) {
    installKeyboardShortcut(controlKey("z"), (e) => {
        dispatch({ action: e.shiftKey ? "ui.redo" : "ui.undo" })
    })
}
