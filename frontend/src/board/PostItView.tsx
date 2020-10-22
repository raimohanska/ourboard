import * as H from "harmaja";
import { h, ListView } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { AppEvent, PostIt } from "../../../common/domain";
import { EditableSpan } from "../components/components"

export const PostItView = (
    { boardId, id, postIt, selected, coordinateHelper, dispatch }: 
    { boardId: string, id: string; postIt: L.Property<PostIt>, selected: L.Atom<boolean>, coordinateHelper: BoardCoordinateHelper, dispatch: (e: AppEvent) => void }
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

  function onClick() {
      selected.set(true)
  }

  const textAtom = L.atom(L.view(postIt, "text"), text => dispatch({ action: "item.update", boardId, item: { ...postIt.get(), text } }))
  const editingThis = L.atom(false)
  const showCoords = false

  return (
    <span
      draggable={true}
      onClick={onClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={L.view(selected, s => s ? "postit selected" : "postit")}
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
          value: textAtom, editingThis
        }} />
        { showCoords ? <small>{L.view(postIt, p => Math.floor(p.x) + ", " + Math.floor(p.y))}</small> : null}
      </span>
    </span>
  );
};