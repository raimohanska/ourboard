import { h } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { Color, Item, newContainer, newPostIt, PostIt } from "../../../common/domain";

export const NewContainer = (
  { onAdd, coordinateHelper }: 
  { coordinateHelper: BoardCoordinateHelper, onAdd: (i: Item) => void }
) => {
  
  const element = L.atom<HTMLElement | null>(null);
  
  function onDragEnd(dragEnd: JSX.DragEvent) {
    const {x, y} = coordinateHelper.currentBoardCoordinates.get()
    const item = newContainer(x, y)
    onAdd(item);
  }
  return <span ref={element.set} onDragEnd={onDragEnd} className="container palette-item" draggable={true}>
    
  </span>
}