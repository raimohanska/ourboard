import { h } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { Board, Item } from "../../../common/domain";
import { BoardFocus } from "./synchronize-focus-with-server"
import { onBoardItemDrag } from "./item-drag"
import { Dispatch } from "./board-store";

type Horizontal = "left" | "right"
type Vertical = "top" | "bottom"

export const SelectionBorder = (
  { id, item, board, coordinateHelper, focus, dispatch }: 
  { id: string, item: L.Property<Item>, coordinateHelper: BoardCoordinateHelper, focus: L.Atom<BoardFocus>, board: L.Property<Board>, dispatch: Dispatch }
) => {
  return <span className="selection-control">
    <span className="corner-drag top left"></span>
    <DragCorner {...{ horizontal: "left", vertical: "top" }}/>
    <DragCorner {...{ horizontal: "left", vertical: "bottom" }}/>
    <DragCorner {...{ horizontal: "right", vertical: "top" }}/>
    <DragCorner {...{ horizontal: "right", vertical: "bottom" }}/>    
  </span>

  function DragCorner({ vertical, horizontal}: { vertical: Vertical, horizontal: Horizontal } ) {    
    const ref= (e: HTMLElement) => onBoardItemDrag(e, id, board, focus, coordinateHelper, (b, current, dragStartPosition, xDiff, yDiff) => {
        let minDiff = Math.min(Math.abs(xDiff), Math.abs(yDiff))
        const maintainAspectRatio = current.type === "image" || current.type === "note"
        if (maintainAspectRatio) {
          if (minDiff < 0.1) {
            xDiff = 0
            yDiff = 0
          } else {
            xDiff = xDiff * minDiff / Math.abs(xDiff)
            yDiff = yDiff * minDiff / Math.abs(yDiff)
          }
        }
        
        const x = horizontal === "left" 
          ? dragStartPosition.x + xDiff
          : dragStartPosition.x
        const y = vertical === "top" 
          ? dragStartPosition.y + yDiff
          : dragStartPosition.y
        const width = Math.max(0.5, horizontal === "left"
          ? dragStartPosition.width - xDiff
          : dragStartPosition.width + xDiff)

        const height = Math.max(0.5, vertical === "top"
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