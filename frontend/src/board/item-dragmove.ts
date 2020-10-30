import * as H from "harmaja";
import { h } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { AppEvent, Board } from "../../../common/domain";
import { BoardFocus } from "./BoardView";
import { onBoardItemDrag } from "./item-drag"


export function itemDragToMove(id: string, board: L.Property<Board>, focus: L.Atom<BoardFocus>, coordinateHelper: BoardCoordinateHelper, dispatch: (e: AppEvent) => void) {
    return (elem: HTMLElement) => onBoardItemDrag(elem, id, board, focus, coordinateHelper, (b, current, dragStartPosition, xDiff, yDiff) => {
        const f = focus.get()
        if (f.status !== "dragging") throw Error("Assertion fail")
        const x = coordinateHelper.getClippedCoordinate(dragStartPosition.x + xDiff, 'clientWidth', current.width - 1)
        const y = coordinateHelper.getClippedCoordinate(dragStartPosition.y + yDiff, 'clientHeight', current.height)
        dispatch({ action: "item.update", boardId: b.id, item: { ...current, x, y } });
    })
}

