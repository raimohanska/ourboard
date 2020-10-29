import * as uuid from "uuid"
import * as L from "lonna";
import { AppEvent, Board, Item } from "../../../common/domain";
import { BoardFocus } from "./BoardView";

const CLIPBOARD_EVENTS = ["cut", "copy", "paste"] as const

// TODO: cypress test this mofo
export function cutCopyPasteHandler(board: L.Property<Board>, focus: L.Atom<BoardFocus>, dispatch: (e: AppEvent) => void) {

    let clipboard: Item[] = [];

    const makeCopy = (i: Item) => {
        if (i.type === "image") {
            return { ...i, id: uuid.v4(), x: i.x + 1, y: i.y + 1 }
        }

        return { ...i, id: uuid.v4(), text: `${i.text} (copy)`, x: i.x + 1, y: i.y + 1 }
    }

    CLIPBOARD_EVENTS.forEach(eventType => {
        document.addEventListener(eventType, e => {
            const currentFocus = focus.get()
            const currentBoard = board.get()
            switch(eventType) {
                case "cut": {
                    if (currentFocus.status !== "selected" || currentFocus.ids.length === 0) return
                    const itemsToCut = currentBoard.items.filter(i => currentFocus.ids.includes(i.id))
                    itemsToCut.forEach(it => dispatch({ action: "item.delete", boardId: currentBoard.id, itemId: it.id }))
                    clipboard = itemsToCut.map(makeCopy)
                    break
                }
                case "copy": {
                    if (currentFocus.status !== "selected" || currentFocus.ids.length === 0) return
                    const itemsToCopy = board.get().items.filter(i => currentFocus.ids.includes(i.id))
                    clipboard = itemsToCopy.map(makeCopy)
                    break
                }
                case "paste": {
                    if (clipboard.length === 0) return
                    clipboard.forEach(it => dispatch({ action: "item.add", boardId: currentBoard.id, item: it }))
                    focus.set({ status: "selected", ids: clipboard.map(it => it.id) })
                    clipboard = []
                    break
                }
            }
        });
    });

                
    
}