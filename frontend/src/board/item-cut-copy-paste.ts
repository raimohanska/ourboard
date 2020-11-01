import * as uuid from "uuid"
import * as L from "lonna";
import _ from "lodash";
import { Board, Id, Item } from "../../../common/domain";
import { BoardFocus } from "./synchronize-focus-with-server"
import { BoardCoordinateHelper } from "./board-coordinates";
import { Dispatch } from "./board-store";

const CLIPBOARD_EVENTS = ["cut", "copy", "paste"] as const

export function cutCopyPasteHandler(board: L.Property<Board>, focus: L.Atom<BoardFocus>, coordinateHelper: BoardCoordinateHelper, dispatch: Dispatch) {

    let clipboard: Item[] = [];

    const makeCopy = (items: Item[], xDiff: number, yDiff: number): { toCreate: Item[], toSelect: Item[] } => {
        const containedItemIds = new Set(items.flatMap(i => i.type === "container" ? i.items : []))            
        const withoutContainedItems = items.filter(i => !containedItemIds.has(i.id))

        let toCreate: Item[] = []
        const toSelect = withoutContainedItems.map(makeCopy)
        toCreate = [...toCreate, ...toSelect]
        return { toCreate, toSelect }

        function makeCopy(i: Item): Item {
            switch (i.type) {
                case "container": 
                    const copiesOfContained = i.items.map(id => items.find(i => i.id === id)!).flatMap(makeCopy)
                    toCreate = [...toCreate, ...copiesOfContained]
                    const copyContainer = { ...i, id: uuid.v4(), x: i.x + xDiff, y: i.y + yDiff, items: copiesOfContained.map(i => i.id) }
                    return copyContainer
    
                default:
                    return { ...i, id: uuid.v4(), x: i.x + xDiff, y: i.y + yDiff }
            } 
        }
    }

    function recursiveItems(ids: Set<Id>, board: Board) {
        return board.items
            .filter(i => ids.has(i.id))
            .flatMap(i => i.type === "container" ? i.items.map(childId => board.items.find(x => x.id === childId)!).concat(i) : i)
    }

    CLIPBOARD_EVENTS.forEach(eventType => {
        document.addEventListener(eventType, e => {
            const currentFocus = focus.get()
            const currentBoard = board.get()
            switch(eventType) {
                case "cut": {
                    if (currentFocus.status !== "selected" || currentFocus.ids.size === 0) return
                    const itemsToCut = recursiveItems(currentFocus.ids, currentBoard)
                    itemsToCut.forEach(it => dispatch({ action: "item.delete", boardId: currentBoard.id, itemId: it.id }))
                    clipboard = itemsToCut
                    break
                }
                case "copy": {
                    if (currentFocus.status !== "selected" || currentFocus.ids.size === 0) return
                    const itemsToCopy = recursiveItems(currentFocus.ids, currentBoard)
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
                    const { toCreate, toSelect } = makeCopy(clipboard, xDiff, yDiff)                    
                    toCreate.forEach(it => dispatch({ action: "item.add", boardId: currentBoard.id, item: it }))
                    focus.set({ status: "selected", ids: new Set(toSelect.map(it => it.id)) })
                    break
                }
            }
        });
    });

                
    
}