import { h } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { Board } from "../../../common/src/domain";
import { BoardFocus } from "./synchronize-focus-with-server"
import { onBoardItemDrag } from "./item-drag"
import { maybeAddToContainer } from "./item-setcontainer"
import { Dispatch } from "./board-store";

export function itemDragToMove(id: string, board: L.Property<Board>, focus: L.Atom<BoardFocus>, coordinateHelper: BoardCoordinateHelper, dispatch: Dispatch) {
    return (elem: HTMLElement) => onBoardItemDrag(elem, id, board, focus, coordinateHelper, (b, current, dragStartPosition, xDiff, yDiff) => {
        // While dragging
        const f = focus.get()
        if (f.status !== "dragging") throw Error("Assertion fail")
        const margin = 0.5
        const x = Math.min(Math.max(dragStartPosition.x + xDiff, margin), b.width - current.width - margin)        
        const y = Math.min(Math.max(dragStartPosition.y + yDiff, margin), b.height - current.height - margin)
        
        dispatch({ action: "item.move", boardId: b.id, items: [{id: current.id, x, y}] });
    },
    (b, current) => {
        maybeAddToContainer(current, b, dispatch)        
    })
}

