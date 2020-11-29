import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { Board } from "../../../common/src/domain";
import { BoardFocus } from "./board-focus";
import { onBoardItemDrag } from "./item-drag"
import { maybeChangeContainer } from "./item-setcontainer"
import { Dispatch } from "./board-store";

export function itemDragToMove(id: string, board: L.Property<Board>, focus: L.Atom<BoardFocus>, coordinateHelper: BoardCoordinateHelper, dispatch: Dispatch) {
    return (elem: HTMLElement) => onBoardItemDrag(elem, id, board, focus, coordinateHelper, (b, items, xDiff, yDiff) => {
        // While dragging
        const f = focus.get()
        if (f.status !== "dragging") throw Error("Assertion fail")
        const margin = 0.5

        const movedItems = items.map(({ dragStartPosition, current }) => {
            const x = Math.min(Math.max(dragStartPosition.x + xDiff, margin), b.width - current.width - margin)        
            const y = Math.min(Math.max(dragStartPosition.y + yDiff, margin), b.height - current.height - margin)
            const container = maybeChangeContainer(current, b)  
            return {id: current.id, x, y, containerId: container ? container.id : undefined }
        })
        
        dispatch({ action: "item.move", boardId: b.id, items: movedItems });
    })
}

