import _ from "lodash";
import * as L from "lonna";
import * as uuid from "uuid";
import { Board, Item, findItemsRecursively } from "../../../common/src/domain";
import { BoardCoordinateHelper } from "./board-coordinates";
import { BoardFocus, getSelectedIds } from "./board-focus";
import { Dispatch } from "../store/board-store";

const CLIPBOARD_EVENTS = ["cut", "copy", "paste"] as const

export function cutCopyPasteHandler(board: L.Property<Board>, focus: L.Atom<BoardFocus>, coordinateHelper: BoardCoordinateHelper, dispatch: Dispatch) {
    const makeCopies = (items: Item[], xDiff: number, yDiff: number): { toCreate: Item[], toSelect: Item[] } => {
        const containerIds = items.map(i => i.id)
        const contained = items.filter(i => !!i.containerId && containerIds.includes(i.containerId))
        const notContained = items.filter(i => !contained.some(c => c.id === i.id))

        let toCreate: Item[] = []
        const toSelect = notContained.map(makeCopy)
        toCreate = [...toCreate, ...toSelect]
        return { toCreate, toSelect }

        function makeCopy(i: Item): Item {
            const containerId = i.id
            const newContainer = move({ ...i, id: uuid.v4()})
            // TODO: this won't work for deep containment hierarchies
            contained.filter(ctd => ctd.containerId === containerId).forEach(ctd => {
                toCreate.push(move({ ...ctd, id: uuid.v4(), containerId: newContainer.id }))
            })
            return newContainer
        }

        function move(i: Item) {
            return { ...i, x: i.x + xDiff, y: i.y + yDiff }
        }
    }

    CLIPBOARD_EVENTS.forEach(eventType => {
        document.addEventListener(eventType, e => {
            const currentFocus = focus.get()
            const currentBoard = board.get()
            switch(eventType) {
                case "cut": {
                    if (currentFocus.status !== "selected" || currentFocus.ids.size === 0) return
                    const itemsToCut = findItemsRecursively([...currentFocus.ids], currentBoard)
                    dispatch({ action: "item.delete", boardId: currentBoard.id, itemIds: itemsToCut.map(i => i.id)})
                    e.clipboardData!.setData("application/rboard", JSON.stringify(itemsToCut))
                    e.preventDefault()
                    break
                }
                case "copy": {
                    if (currentFocus.status !== "selected") return;
                    const selectedIds = getSelectedIds(currentFocus)
                    const clipboard = findItemsRecursively([...selectedIds], currentBoard)
                    e.clipboardData!.setData("application/rboard", JSON.stringify(clipboard))
                    e.preventDefault()
                    break
                }
                case "paste": {
                    if (currentFocus.status === "editing") return
                    const rboardData = e.clipboardData?.getData("application/rboard")
                    if (!rboardData) return
                    const clipboard = JSON.parse(rboardData) as Item[]                    
                    const xCenterOld = _.sum(clipboard.map(i => i.x + i.width / 2)) / clipboard.length
                    const yCenterOld = _.sum(clipboard.map(i => i.y + i.height / 2)) / clipboard.length
                    const currentCenter = coordinateHelper.currentBoardCoordinates.get()
                    const xDiff = currentCenter.x - xCenterOld
                    const yDiff = currentCenter.y - yCenterOld
                    const { toCreate, toSelect } = makeCopies(clipboard, xDiff, yDiff)                    
                    dispatch({ action: "item.add", boardId: currentBoard.id, items: toCreate })
                    focus.set({ status: "selected", ids: new Set(toSelect.map(it => it.id)) })
                    e.preventDefault()
                    break
                }
            }
        });
    });

                
    
}