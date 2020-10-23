import * as H from "harmaja";
import { h, ListView } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { AppEvent, PostIt } from "../../../common/domain";
import { EditableSpan } from "../components/components"
import { BoardFocus } from "./BoardView";
import { atom } from "lonna";

export type ItemFocus = "none" | "selected" | "editing"

export const PostItView = (
    { boardId, id, postIt, focus, coordinateHelper, dispatch }: 
    {  
        boardId: string, id: string; postIt: L.Property<PostIt>, 
        focus: L.Atom<BoardFocus>,
        coordinateHelper: BoardCoordinateHelper, dispatch: (e: AppEvent) => void }
) => {
  const itemFocus = L.view(focus, f => {
      if (f.status === "none") return "none"
      if (f.status === "selected") return f.ids.includes(id) ? "selected" : "none"
      return f.id === id ? "editing" : "none"
  })
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
  function onMouseDown(e: JSX.MouseEvent) {
      const f = focus.get()
      if (e.shiftKey && f.status === "selected") {
        if (f.ids.includes(id)) {
            focus.set({ status: "selected", ids: f.ids.filter(i => i !== id)})    
        } else {
            focus.set({ status: "selected", ids: f.ids.concat(id)})    
        }
      } else {
        focus.set({ status: "selected", ids: [id]})
      }      
  }
  const textAtom = L.atom(L.view(postIt, "text"), text => dispatch({ action: "item.update", boardId, item: { ...postIt.get(), text } }))
  const showCoords = false

  return (
    <span
      draggable={true}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onMouseDown={onMouseDown}
      className={L.view(itemFocus, s => s !== "none" ? "postit selected" : "postit")}
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
              L.view(itemFocus, f => f === "editing"),
              e => focus.set(e ? { status: "editing", id } : { status: "selected", ids: [id] })
          )
        }} />
        { showCoords ? <small>{L.view(postIt, p => Math.floor(p.x) + ", " + Math.floor(p.y))}</small> : null}
      </span>
    </span>
  );
};