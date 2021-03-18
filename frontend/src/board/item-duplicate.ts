import { componentScope } from "harmaja"
import * as L from "lonna"
import { Board } from "../../../common/src/domain"
import { BoardFocus } from "./board-focus"
import { Dispatch } from "../store/server-connection"
import { findSelectedItems, makeCopies } from "./item-cut-copy-paste"

export function itemDuplicateHandler(board: L.Property<Board>, dispatch: Dispatch, focus: L.Atom<BoardFocus>) {
    ;["keydown", "keyup", "keypress"].forEach((eventName) => {
        // Prevent default for all ctrl-d events
        L.fromEvent<JSX.KeyboardEvent>(document, eventName)
            .pipe(L.applyScope(componentScope()))
            .forEach((e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "d") {
                    e.preventDefault()
                    if (eventName === "keydown") {
                        const currentBoard = board.get()
                        const itemsAndConnections = findSelectedItems(focus.get(), currentBoard)
                        const { toCreate, toSelect, connections } = makeCopies(itemsAndConnections, 1, 1)
                        dispatch({ action: "item.add", boardId: currentBoard.id, items: toCreate, connections })
                        focus.set({ status: "selected", ids: new Set(toSelect.map((it) => it.id)) })
                    }
                }
            })
    })
}
