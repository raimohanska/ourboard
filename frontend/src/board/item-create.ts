import { componentScope } from "harmaja"
import * as L from "lonna"
import { Board, Item, newContainer, newSimilarNote, newText, Note } from "../../../common/src/domain"
import { BoardFocus, getSelectedItem } from "./board-focus"

export function itemCreateHandler(
    board: L.Property<Board>,
    focus: L.Property<BoardFocus>,
    latestNote: L.Property<Note>,
    boardElement: L.Property<HTMLElement | null>,
    onAdd: (item: Item) => void,
) {
    L.fromEvent<JSX.KeyboardEvent>(document, "keyup")
        .pipe(L.applyScope(componentScope()))
        .forEach((event) => {
            if (event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) return
            if (event.key === "n") {
                addNode(event)
            } else if (event.key === "a") {
                addItem(event, newContainer())
            } else if (event.key === "t") {
                addItem(event, newText())
            }
        })

    L.fromEvent<JSX.KeyboardEvent>(window, "dblclick")
        .pipe(L.applyScope(componentScope()))
        .forEach((event) => {
            if (shouldCreate(event)) {
                addNode(event)
            }
        })

    function addNode(e: JSX.HarmajaEvent) {
        addItem(e, newSimilarNote(latestNote.get()))
    }

    function addItem(e: JSX.HarmajaEvent, newItem: Item) {
        onAdd(newItem)
        e.preventDefault()
    }

    function shouldCreate(event: JSX.HarmajaEvent) {
        if (event.target === boardElement.get()! || boardElement.get()!.contains(event.target as Node)) {
            const f = focus.get()
            const selectedElement = getSelectedItem(board.get())(focus.get())
            if (f.status === "none" || (selectedElement && selectedElement.type === "container")) {
                return true
            }
        }
        return false
    }
}
