import * as H from "harmaja";
import { h } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { AppEvent, Board, PostIt } from "../../../common/domain";
import { BoardFocus } from "./BoardView";
import { onBoardItemDrag } from "./board-drag"
export type ItemFocus = "none" | "selected" | "editing"

type Horizontal = "left" | "right"
type Vertical = "top" | "bottom"

export const SelectionBorder = (
  { id, item, board, coordinateHelper, focus, dispatch }: 
  { id: string, item: L.Property<PostIt>, coordinateHelper: BoardCoordinateHelper, focus: L.Atom<BoardFocus>, board: L.Property<Board>, dispatch: (e: AppEvent) => void }
) => {
  return <span className="selection-control">
    <span className="corner-drag top left"></span>
    <DragCorner {...{ horizontal: "left", vertical: "top" }}/>
    <DragCorner {...{ horizontal: "left", vertical: "bottom" }}/>
    <DragCorner {...{ horizontal: "right", vertical: "top" }}/>
    <DragCorner {...{ horizontal: "right", vertical: "bottom" }}/>    
  </span>

  function DragCorner({ vertical, horizontal}: { vertical: Vertical, horizontal: Horizontal } ) {    
    const ref= (e: HTMLElement) => onBoardItemDrag(e, board, focus, coordinateHelper, (b, current, dragStartPosition, xDiff, yDiff) => {
      const x = horizontal === "left" 
          ? coordinateHelper.getClippedCoordinate(dragStartPosition.x + xDiff, 'clientWidth', current.width-1)
          : dragStartPosition.x
        const y = vertical === "top" 
          ? coordinateHelper.getClippedCoordinate(dragStartPosition.y + yDiff, 'clientHeight', current.height)
          : dragStartPosition.y
        const width = Math.max(2, horizontal === "left"
          ? dragStartPosition.width - xDiff
          : dragStartPosition.width + xDiff)

        const height = Math.max(2, vertical === "top"
          ? dragStartPosition.height - yDiff
          : dragStartPosition.height + yDiff)

        dispatch({ action: "item.update", boardId: b.id, item: { 
          ...current, x, y, width, height
        } });
    })
    
    return <span 
      ref={ref}
      draggable={true}
      className={`corner-drag ${horizontal} ${vertical}`}
    />
  }
}