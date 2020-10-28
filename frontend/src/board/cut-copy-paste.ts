import * as uuid from "uuid"
import * as L from "lonna";
import { AppEvent, Board, Item, PostIt } from "../../../common/domain";
import { BoardFocus } from "./BoardView";

const CLIPBOARD_EVENTS = ["cut", "copy", "paste"] as const

// TODO: cypress test this mofo
export function cutCopyPasteHandler(board: L.Property<Board>, focus: L.Atom<BoardFocus>, dispatch: (e: AppEvent) => void) {

    let clipboard: Item[] = [];

    CLIPBOARD_EVENTS.forEach(eventType => {
        document.addEventListener(eventType, e => {
            const currentFocus = focus.get()
            const currentBoard = board.get()
            switch(eventType) {
                case "cut": {
                    if (currentFocus.status !== "selected" || currentFocus.ids.length === 0) return
                    clipboard = currentBoard.items.filter(i => currentFocus.ids.includes(i.id))
                    console.log("removing", [...clipboard])
                    clipboard.forEach(it => dispatch({ action: "item.delete", boardId: currentBoard.id, itemId: it.id }))
                    clipboard = clipboard.map(it => ({ ...it, id: uuid.v4() }))
                    console.log("cut clip", [...clipboard])
                    break
                }
                case "copy": {
                    if (currentFocus.status !== "selected" || currentFocus.ids.length === 0) return
                    const itemsToCopy = board.get().items.filter(i => currentFocus.ids.includes(i.id))
                    clipboard = itemsToCopy.map(it => ({ ...it, id: uuid.v4() }))
                    console.log("copy", [...clipboard], itemsToCopy)
                    break
                }
                case "paste": {
                    if (clipboard.length === 0) return
                    clipboard.forEach(it => dispatch({ action: "item.add", boardId: currentBoard.id, item: it }))
                    console.log("pasting", [...clipboard])
                    clipboard = []
                    break
                }
            }
        });
    });

                
    
}