import { componentScope } from "harmaja"
import * as L from "lonna"
import { Dispatch } from "../store/state-store"

export function itemUndoHandler(dispatch: Dispatch) {
    ;["keydown", "keyup", "keypress"].forEach((eventName) => {
        // Prevent default for all of these to prevent Backspace=Back behavior on Firefox
        L.fromEvent<JSX.KeyboardEvent>(document, eventName)
            .pipe(L.applyScope(componentScope()))
            .forEach((e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "z") {
                    if (eventName === "keydown") {
                        e.preventDefault()
                        if (e.shiftKey) {
                            dispatch({ action: "ui.redo" })
                        } else {
                            dispatch({ action: "ui.undo" })
                        }
                    }
                }
            })
    })
}
