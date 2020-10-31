import * as H from "harmaja";
import { h } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { AppEvent, Board } from "../../../common/domain";
import { BoardFocus } from "./BoardView";
import { onBoardItemDrag } from "./item-drag"
import { containedBy, overlaps } from "./geometry";


export function itemDragToMove(id: string, board: L.Property<Board>, focus: L.Atom<BoardFocus>, coordinateHelper: BoardCoordinateHelper, dispatch: (e: AppEvent) => void) {
    return (elem: HTMLElement) => onBoardItemDrag(elem, id, board, focus, coordinateHelper, (b, current, dragStartPosition, xDiff, yDiff) => {
        // While dragging
        const f = focus.get()
        if (f.status !== "dragging") throw Error("Assertion fail")
        const margin = 0.5
        const x = Math.min(Math.max(dragStartPosition.x + xDiff, margin), b.width - current.width - margin)        
        const y = Math.min(Math.max(dragStartPosition.y + yDiff, margin), b.height - current.height - margin)
        
        dispatch({ action: "item.move", boardId: b.id, itemId: current.id, x, y });
    },
    (b, current) => {
        // On drop
        if (current.type !== "container") {
            const currentContainer = b.items.find(i => (i.type === "container") && i.items.includes(id))
            if (currentContainer && containedBy(current, currentContainer)) return

            const newContainer = b.items.find(i => (i.type === "container") && containedBy(current, i))
            if (newContainer != currentContainer) {
                dispatch({ action: "item.setcontainer", boardId: b.id, itemId: id, containerId: newContainer ? newContainer.id : null })
            }
        }
    })
}

