import * as H from "harmaja";
import { h } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { AppEvent, Board, PostIt } from "../../../common/domain";
import { EditableSpan } from "../components/components"
import { BoardFocus } from "./BoardView";
import { ContextMenu, HIDDEN_CONTEXT_MENU } from "./ContextMenuView"
import { onBoardItemDrag } from "./board-drag"
import { SelectionBorder } from "./SelectionBorder"
import { itemDragToMove } from "./item-dragmove"
export type ItemFocus = "none" | "selected" | "editing"

export const PostItView = (
    { board, id, postIt, focus, coordinateHelper, dispatch, contextMenu }:
    {  
        board: L.Property<Board>, id: string; postIt: L.Property<PostIt>, 
        focus: L.Atom<BoardFocus>,
        coordinateHelper: BoardCoordinateHelper, dispatch: (e: AppEvent) => void,
        contextMenu: L.Atom<ContextMenu>
    }
) => {
  const itemFocus = L.view(focus, f => {
      if (f.status === "none") return "none"
      if (f.status === "selected") return f.ids.includes(id) ? "selected" : "none"
      return f.id === id ? "editing" : "none"
  })

  const ref = itemDragToMove(id, board, focus, coordinateHelper, dispatch)

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
        focus.set({ status: "selected", ids: [id] })
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
      ref={ref}
      draggable={true}
      onClick={onClick}
      
      className={L.view(selected, s => s ? "postit postit-existing selected" : "postit postit-existing")}
      style={postIt.pipe(L.map((p: PostIt) => ({
        top: p.y + "em",
        left: p.x + "em",
        height: p.height + "em",
        width: p.width + "em",
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
      { L.view(selected, s => s ? <SelectionBorder {...{ id, item: postIt, coordinateHelper, board, focus, dispatch}}/> : null) }
    </span>
  );
};