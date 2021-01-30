import { componentScope } from "harmaja";
import * as L from "lonna";
import { Id } from "../../../common/src/domain";
import { Dispatch } from "../store/board-store";
import { BoardFocus } from "./board-focus";

export function itemDeleteHandler(boardId: Id, dispatch: Dispatch, focus: L.Property<BoardFocus>) {
    ["keydown", "keyup", "keypress"].forEach(eventName => { // Prevent default for all of these to prevent Backspace=Back behavior on Firefox
        L.fromEvent<JSX.KeyboardEvent>(document, eventName).pipe(L.applyScope(componentScope())).forEach(e => {
            if (e.keyCode === 8 || e.keyCode === 46) { // del or backspace
                e.preventDefault()
                if (eventName === "keyup") {
                    const s = focus.get()
                    if (s.status === "selected") {
                        s.ids.forEach(id => dispatch({ action: "item.delete", boardId, itemIds: [id] }))
                    }
                }
            }
        })
    })
}
