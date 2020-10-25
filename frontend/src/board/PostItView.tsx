import * as H from "harmaja";
import { h, ListView } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { AppEvent, Board, PostIt } from "../../../common/domain";
import { EditableSpan } from "../components/components"
import { BoardFocus } from "./BoardView";
import { atom } from "lonna";
import { ContextMenu, HIDDEN_CONTEXT_MENU } from "./ContextMenuView"

export type ItemFocus = "none" | "selected" | "editing"

const POSTIT_WIDTH = 5
const POSTIT_HEIGHT = 5

const DND_GHOST_HIDING_IMAGE = new Image();
// https://png-pixel.com/
DND_GHOST_HIDING_IMAGE.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

export const PostItView = (
    { board, id, postIt, focus, coordinateHelper, dispatch, contextMenu }:
    {  
        board: L.Property<Board>, id: string; postIt: L.Property<PostIt>, 
        focus: L.Atom<BoardFocus>,
        coordinateHelper: BoardCoordinateHelper, dispatch: (e: AppEvent) => void,
        contextMenu: L.Atom<ContextMenu>}
) => {
  const itemFocus = L.view(focus, f => {
      if (f.status === "none") return "none"
      if (f.status === "selected") return f.ids.includes(id) ? "selected" : "none"
      return f.id === id ? "editing" : "none"
  })
  let dragStart: JSX.DragEvent | null = null;
  let dragStartPositions: { id: string, x: number, y: number }[]
  function onDragStart(e: JSX.DragEvent) {
    const f = focus.get()
    if (f.status !== "selected" || !f.ids.includes(id)) {
        focus.set({ status: "selected", ids: [id]})
    }
    dragStart = e;
    dragStart.dataTransfer.setDragImage(DND_GHOST_HIDING_IMAGE, 0, 0);
    dragStartPositions = board.get().items.map(postIt => { return { id: postIt.id, x: postIt.x, y: postIt.y }})
  }
  function onDrag() {
    const { x: xDiff, y: yDiff } = coordinateHelper.boardCoordDiffFromThisClientPoint({x: dragStart!.clientX, y: dragStart!.clientY })

    const f = focus.get()
    if (f.status !== "selected") throw Error("Assertion fail")
    const b = board.get()
    f.ids.forEach(id => {
      const current = b.items.find(i => i.id === id)
      const dragStartPosition = dragStartPositions.find(i => i.id === id)
      if (!current || !dragStartPosition) throw Error("Item not found: " + id)
      const x = coordinateHelper.getClippedCoordinate(dragStartPosition.x + xDiff, 'clientWidth', POSTIT_WIDTH-1)
      const y = coordinateHelper.getClippedCoordinate(dragStartPosition.y + yDiff, 'clientHeight', POSTIT_HEIGHT)
      dispatch({ action: "item.update", boardId: b.id, item: { ...current, x, y } });
    })
  }
  function onClick(e: JSX.MouseEvent) {
    contextMenu.set(HIDDEN_CONTEXT_MENU)
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

  function onContextMenu(e: JSX.MouseEvent) {
    onClick(e)
    const { x, y } = coordinateHelper.currentClientCoordinates.get()
    contextMenu.set({ hidden: false, x: x, y: y})
    e.preventDefault()
  }

  const textAtom = L.atom(L.view(postIt, "text"), text => dispatch({ action: "item.update", boardId: board.get().id, item: { ...postIt.get(), text } }))
  const showCoords = false
  const selected = L.view(itemFocus, s => s !== "none")

  return (
    <span
      draggable={true}
      onDragStart={onDragStart}
      onDrag={onDrag}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={L.view(selected, s => s ? "postit selected" : "postit")}
      style={postIt.pipe(L.map((p: PostIt) => ({
        top: p.y + "em",
        left: p.x + "em",
        height: POSTIT_WIDTH + "em",
        width: POSTIT_HEIGHT + "em",
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
      { L.view(selected, s => s ? <SelectionBorder/> : null) }
    </span>
  );
};

const SelectionBorder = () => {
  return <span className="selection-control">
    <span className="corner-drag top left"></span>
    <span className="corner-drag top right"></span>
    <span className="corner-drag bottom right"></span>
    <span className="corner-drag bottom left"></span>
  </span>
}