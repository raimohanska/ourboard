import { componentScope } from "harmaja"
import * as L from "lonna"
import { Board } from "../../../common/src/domain"
import { BoardFocus } from "./board-focus"

export function itemSelectAllHandler(board: L.Property<Board>, focus: L.Atom<BoardFocus>) {
    ;["keydown", "keyup", "keypress"].forEach((eventName) => {
        // Prevent default for all ctrl-a events
        L.fromEvent<JSX.KeyboardEvent>(document, eventName)
            .pipe(L.applyScope(componentScope()))
            .forEach((e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "a") {
                    e.preventDefault()
                    if (eventName === "keydown") {
                        focus.set({ status: "selected", ids: new Set(Object.keys(board.get().items)) })
                    }
                }
            })
    })
}
