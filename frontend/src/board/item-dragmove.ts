import * as H from "harmaja";
import { h } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { AppEvent, Board, PostIt } from "../../../common/domain";
import { EditableSpan } from "../components/components"
import { BoardFocus } from "./BoardView";
import { ContextMenu, HIDDEN_CONTEXT_MENU } from "./ContextMenuView"
import { onBoardItemDrag } from "./board-drag"
import { SelectionBorder } from "./SelectionBorder"
export type ItemFocus = "none" | "selected" | "editing"

export function itemDragToMove(id: string, board: L.Property<Board>, focus: L.Atom<BoardFocus>, coordinateHelper: BoardCoordinateHelper, dispatch: (e: AppEvent) => void) {
    return (elem: HTMLElement) => onBoardItemDrag(elem, id, board, focus, coordinateHelper, (b, current, dragStartPosition, xDiff, yDiff) => {
        const f = focus.get()
        if (f.status !== "selected") throw Error("Assertion fail")
        const x = coordinateHelper.getClippedCoordinate(dragStartPosition.x + xDiff, 'clientWidth', current.width - 1)
        const y = coordinateHelper.getClippedCoordinate(dragStartPosition.y + yDiff, 'clientHeight', current.height)
        dispatch({ action: "item.update", boardId: b.id, item: { ...current, x, y } });
    })
}

