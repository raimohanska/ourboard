import * as uuid from "uuid"
import * as L from "lonna";
import * as _ from "lodash";
import { AppEvent, Board, Item } from "../../../common/domain";
import { BoardFocus } from "./BoardView";
import { BoardCoordinateHelper } from "./board-coordinates";

const CLIPBOARD_EVENTS = ["cut", "copy", "paste"] as const

// TODO: cypress test this mofo
export function cutCopyPasteHandler(board: L.Property<Board>, focus: L.Atom<BoardFocus>, coordinateHelper: BoardCoordinateHelper, dispatch: (e: AppEvent) => void) {

    let clipboard: Item[] = [];

    const makeCopy = (xDiff: number, yDiff: number) => (i: Item) => {
        switch (i.type) {
            case "image": return { ...i, id: uuid.v4(), x: i.x + xDiff, y: i.y + yDiff }
            case "note": return { ...i, id: uuid.v4(), text: i.text, x: i.x + xDiff, y: i.y + yDiff }
            default: throw Error("Unsupported item")
        }    
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
                    clipboard = itemsToCut
                    break
                }
                case "copy": {
                    if (currentFocus.status !== "selected" || currentFocus.ids.length === 0) return
                    const itemsToCopy = board.get().items.filter(i => currentFocus.ids.includes(i.id))
                    clipboard = itemsToCopy
                    break
                }
                case "paste": {
                    if (clipboard.length === 0) return
                    const xCenterOld = _.sum(clipboard.map(i => i.x + i.width / 2)) / clipboard.length
                    const yCenterOld = _.sum(clipboard.map(i => i.y + i.height / 2)) / clipboard.length
                    const currentCenter = coordinateHelper.currentBoardCoordinates.get()
                    const xDiff = currentCenter.x - xCenterOld
                    const yDiff = currentCenter.y - yCenterOld
                    const copies = clipboard.map(makeCopy(xDiff, yDiff))
                    
                    copies.forEach(it => dispatch({ action: "item.add", boardId: currentBoard.id, item: it }))
                    focus.set({ status: "selected", ids: copies.map(it => it.id) })
                    break
                }
            }
        });
    });

                
    
}