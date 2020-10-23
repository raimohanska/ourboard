import * as H from "harmaja";
import { h, ListView } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { AppEvent, PostIt } from "../../../common/domain";
import { EditableSpan } from "../components/components"
import { ItemFocus } from "./BoardView";
import { atom } from "lonna";

export const PostItView = (
    { boardId, id, postIt, focus, coordinateHelper, dispatch }: 
    {  
        boardId: string, id: string; postIt: L.Property<PostIt>, 
        focus: L.Atom<ItemFocus>,
        coordinateHelper: BoardCoordinateHelper, dispatch: (e: AppEvent) => void }
) => {
  let dragStart: JSX.DragEvent | null = null;
  function onDragStart(e: JSX.DragEvent) {
    dragStart = e;
  }
  function onDragEnd() {
    const { x: xDiff, y: yDiff } = coordinateHelper.boardCoordDiffFromThisClientPoint({x: dragStart!.clientX, y: dragStart!.clientY })
    const current = postIt.get();
    const x = current.x + xDiff;
    const y = current.y + yDiff;    
    dispatch({ action: "item.update", boardId, item: { ...current, x, y } });
  }
  function onMouseDown() {
      focus.set("selected")
  }
  const textAtom = L.atom(L.view(postIt, "text"), text => dispatch({ action: "item.update", boardId, item: { ...postIt.get(), text } }))
  const showCoords = false

  return (
    <span
      draggable={true}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onMouseDown={onMouseDown}
      className={L.view(focus, s => s !== "none" ? "postit selected" : "postit")}
      style={postIt.pipe(L.map((p: PostIt) => ({
        top: p.y + "em",
        left: p.x + "em",
        height: "5em",
        width: "5em",
        background: p.color,
        padding: "1em",
        position: "absolute"
      })))}
      color={L.view(postIt, "color")}
    >
      <span className="text">
        <EditableSpan {...{
          value: textAtom, editingThis: L.atom(
              L.view(focus, f => f === "editing"),
              e => focus.set(e ? "editing" : "selected")
          )
        }} />
        { showCoords ? <small>{L.view(postIt, p => Math.floor(p.x) + ", " + Math.floor(p.y))}</small> : null}
      </span>
    </span>
  );
};