import * as H from "harmaja";
import { h, ListView } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { AppEvent, Board, Color, newPostIt } from "../../../common/domain";

export const NewPostIt = (
  { boardId, color, dispatch, coordinateHelper }: 
  { boardId: string, color: Color, coordinateHelper: BoardCoordinateHelper, dispatch: (e: AppEvent) => void }
) => {
  const style = {
    background: color
  }
  
  const element = L.atom<HTMLElement | null>(null);
  
  function onDragEnd(dragEnd: JSX.DragEvent) {
    const {x, y} = coordinateHelper.currentBoardCoordinates()

    const item = newPostIt("HELLO", color, x, y)

    dispatch({ action: "item.add", boardId, item });
  }
  return <span ref={element.set} onDragEnd={onDragEnd} className="postit" draggable={true} style={style}>
    <span className="text"></span>
  </span>
}