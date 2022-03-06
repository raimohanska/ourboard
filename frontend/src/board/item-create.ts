import * as L from "lonna"
import { Board, Item, newContainer, newSimilarNote, newText, Note } from "../../../common/src/domain"
import { BoardFocus, getSelectedItem } from "./board-focus"
import { installDoubleClickHandler } from "./double-click"
import { installKeyboardShortcut, plainKey } from "./keyboard-shortcuts"

export function itemCreateHandler(
    board: L.Property<Board>,
    focus: L.Property<BoardFocus>,
    latestNote: L.Property<Note>,
    boardElement: L.Property<HTMLElement | null>,
    onAdd: (item: Item) => void,
) {
    installKeyboardShortcut(plainKey("n"), () => onAdd(newSimilarNote(latestNote.get())))
    installKeyboardShortcut(plainKey("a"), () => onAdd(newContainer()))
    installKeyboardShortcut(plainKey("t"), () => onAdd(newText()))

    installDoubleClickHandler((e) => {
        shouldCreateOnDblClick(e) && onAdd(newSimilarNote(latestNote.get()))
    })

    function shouldCreateOnDblClick(event: JSX.UIEvent) {
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
