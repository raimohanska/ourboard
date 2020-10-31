import * as H from "harmaja";
import { h } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { AppEvent, Board } from "../../../common/domain";
import { BoardFocus } from "./BoardView";
import { onBoardItemDrag } from "./item-drag"
import { containedBy, overlaps } from "./geometry";
import { maybeAddToContainer } from "./item-setcontainer"

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
        maybeAddToContainer(current, b, dispatch)        
    })
}

