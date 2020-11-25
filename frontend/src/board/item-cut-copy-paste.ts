import * as uuid from "uuid"
import * as L from "lonna";
import _ from "lodash";
import { Board, Container, Containee, Id, Item } from "../../../common/src/domain";
import { BoardFocus } from "./synchronize-focus-with-server"
import { BoardCoordinateHelper } from "./board-coordinates";
import { Dispatch } from "./board-store";

const CLIPBOARD_EVENTS = ["cut", "copy", "paste"] as const

export function cutCopyPasteHandler(board: L.Property<Board>, focus: L.Atom<BoardFocus>, coordinateHelper: BoardCoordinateHelper, dispatch: Dispatch) {

    let clipboard: Item[] = [];

    const makeCopies = (items: Item[], xDiff: number, yDiff: number): { toCreate: Item[], toSelect: Item[] } => {
        const containerIds = items.filter(i => i.type === "container").map(i => i.id)
        const contained = items.filter((i): i is Containee => i.type !== "container" && !!i.containerId && containerIds.includes(i.containerId))
        const notContained = items.filter(i => !contained.some(c => c.id === i.id))

        let toCreate: Item[] = []
        const toSelect = notContained.map(makeCopy)
        toCreate = [...toCreate, ...toSelect]
        return { toCreate, toSelect }

        function makeCopy(i: Item): Item {
            if (i.type !== "container") {
                return move({ ...i, id: uuid.v4()})
            }
            const containerId = i.id
            const newContainer = move({ ...i, id: uuid.v4()})
            contained.filter(ctd => ctd.containerId === containerId).forEach(ctd => {
                toCreate.push(move({ ...ctd, id: uuid.v4(), containerId: newContainer.id }))
            })
            return newContainer
        }

        function move(i: Item) {
            return { ...i, x: i.x + xDiff, y: i.y + yDiff }
        }

        
    }

    function selectedItemsAndChildren(selectedIDs: Set<Id>, board: Board) {
        const containerOfItemIsSelected = (i: Item) => i.type !== "container" && i.containerId && selectedIDs.has(i.containerId)
        return board.items
            .filter(i => selectedIDs.has(i.id) || containerOfItemIsSelected(i))
    }

    CLIPBOARD_EVENTS.forEach(eventType => {
        document.addEventListener(eventType, e => {
            const currentFocus = focus.get()
            const currentBoard = board.get()
            switch(eventType) {
                case "cut": {
                    if (currentFocus.status !== "selected" || currentFocus.ids.size === 0) return
                    const itemsToCut = selectedItemsAndChildren(currentFocus.ids, currentBoard)
                    dispatch({ action: "item.delete", boardId: currentBoard.id, itemIds: itemsToCut.map(i => i.id)})
                    clipboard = itemsToCut
                    break
                }
                case "copy": {
                    if (currentFocus.status === "selected") {
                        clipboard = selectedItemsAndChildren(currentFocus.ids, currentBoard)
                    }
                    else if (currentFocus.status === "editing") {
                        clipboard = selectedItemsAndChildren(new Set([currentFocus.id]), currentBoard)
                    }
                    break
                }
                case "paste": {
                    if (clipboard.length === 0) return
                    const xCenterOld = _.sum(clipboard.map(i => i.x + i.width / 2)) / clipboard.length
                    const yCenterOld = _.sum(clipboard.map(i => i.y + i.height / 2)) / clipboard.length
                    const currentCenter = coordinateHelper.currentBoardCoordinates.get()
                    const xDiff = currentCenter.x - xCenterOld
                    const yDiff = currentCenter.y - yCenterOld
                    const { toCreate, toSelect } = makeCopies(clipboard, xDiff, yDiff)                    
                    dispatch({ action: "item.add", boardId: currentBoard.id, items: toCreate })
                    focus.set({ status: "selected", ids: new Set(toSelect.map(it => it.id)) })
                    break
                }
            }
        });
    });

                
    
}