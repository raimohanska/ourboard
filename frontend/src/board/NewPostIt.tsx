import { h } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { Color, newPostIt, PostIt } from "../../../common/domain";

export const NewPostIt = (
  { color, onAdd, coordinateHelper }: 
  { color: Color, coordinateHelper: BoardCoordinateHelper, onAdd: (i: PostIt) => void }
) => {
  const style = {
    background: color
  }
  
  const element = L.atom<HTMLElement | null>(null);
  
  function onDragEnd(dragEnd: JSX.DragEvent) {
    const {x, y} = coordinateHelper.currentBoardCoordinates.get()
    const item = newPostIt("HELLO", color, x, y)
    onAdd(item);
  }
  return <span ref={element.set} onDragEnd={onDragEnd} className="postit palette-item" draggable={true} style={style}>
    <span className="text"></span>
  </span>
}