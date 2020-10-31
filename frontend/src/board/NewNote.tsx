import { h } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { Color, newNote, Note } from "../../../common/domain";

export const NewNote = (
  { color, onAdd, coordinateHelper }: 
  { color: Color, coordinateHelper: BoardCoordinateHelper, onAdd: (i: Note) => void }
) => {
  const style = {
    background: color
  }
  
  const element = L.atom<HTMLElement | null>(null);
  
  function onDragEnd(dragEnd: JSX.DragEvent) {
    const {x, y} = coordinateHelper.currentBoardCoordinates.get()
    const item = newNote("HELLO", color, x, y)
    onAdd(item);
  }
  return <span ref={element.set} onDragEnd={onDragEnd} className="note palette-item" draggable={true} style={style}>
    <span className="text"></span>
  </span>
}