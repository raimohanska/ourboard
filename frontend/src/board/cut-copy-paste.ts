import * as uuid from "uuid"
import * as L from "lonna";
import _ from "lodash";
import { AppEvent, Board, Item } from "../../../common/domain";
import { BoardFocus } from "./BoardView";
import { BoardCoordinateHelper } from "./board-coordinates";

const CLIPBOARD_EVENTS = ["cut", "copy", "paste"] as const

// TODO: cypress test this mofo
export function cutCopyPasteHandler(board: L.Property<Board>, focus: L.Atom<BoardFocus>, coordinateHelper: BoardCoordinateHelper, dispatch: (e: AppEvent) => void) {

    let clipboard: Item[] = [];

    const makeCopy = (items: Item[], board: Board, xDiff: number, yDiff: number): { toCreate: Item[], toSelect: Item[] } => {
        const containedItemIds = new Set(items.flatMap(i => i.type === "container" ? i.items : []))
            
        const withoutContainedItems = items.filter(i => !containedItemIds.has(i.id))

        console.log("rootitems", withoutContainedItems)

        let toCreate: Item[] = []
        const toSelect = withoutContainedItems.map(makeCopy)
        toCreate = [...toCreate, ...toSelect]
        return { toCreate, toSelect }

        function makeCopy(i: Item): Item {
            switch (i.type) {
                case "container": 
                    const copiesOfContained = i.items.map(id => board.items.find(i => i.id === id)!).flatMap(makeCopy)
                    toCreate = [...toCreate, ...copiesOfContained]
                    const copyContainer = { ...i, id: uuid.v4(), x: i.x + xDiff, y: i.y + yDiff, items: copiesOfContained.map(i => i.id) }
                    return copyContainer
    
                default:
                    return { ...i, id: uuid.v4(), x: i.x + xDiff, y: i.y + yDiff }
            } 
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
                    const { toCreate, toSelect } = makeCopy(clipboard, board.get(), xDiff, yDiff)                    
                    toCreate.forEach(it => dispatch({ action: "item.add", boardId: currentBoard.id, item: it }))
                    focus.set({ status: "selected", ids: toSelect.map(it => it.id) })
                    break
                }
            }
        });
    });

                
    
}