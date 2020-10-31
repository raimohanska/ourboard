import * as H from "harmaja";
import { h } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { AppEvent, Board, Id, PostIt, ItemLocks } from "../../../common/domain";
import { EditableSpan } from "../components/components"
import { BoardFocus } from "./BoardView";
import { ContextMenu, HIDDEN_CONTEXT_MENU } from "./ContextMenuView"
import { onBoardItemDrag } from "./item-drag"
import { SelectionBorder } from "./SelectionBorder"
import { itemDragToMove } from "./item-dragmove"
import { itemSelectionHandler } from "./item-selection";

export const PostItView = (
    { board, id, postIt, locks, userId, focus, coordinateHelper, dispatch, contextMenu }:
    {  
        board: L.Property<Board>, id: string; postIt: L.Property<PostIt>,
        locks: L.Property<ItemLocks>,
        userId: L.Property<Id | null>,
        focus: L.Atom<BoardFocus>,
        coordinateHelper: BoardCoordinateHelper, dispatch: (e: AppEvent) => void,
        contextMenu: L.Atom<ContextMenu>
    }
) => {

  const ref = itemDragToMove(id, board, focus, coordinateHelper, dispatch)

  const { itemFocus, selected, onClick } = itemSelectionHandler(id, focus, contextMenu, board, userId, locks, dispatch)

  function onContextMenu(e: JSX.MouseEvent) {
    onClick(e)
    const { x, y } = coordinateHelper.currentClientCoordinates.get()
    contextMenu.set({ hidden: false, x: x, y: y})
    e.preventDefault()
  }

  const textAtom = L.atom(L.view(postIt, "text"), text => dispatch({ action: "item.update", boardId: board.get().id, item: { ...postIt.get(), text } }))
  const showCoords = false

  const dataTest = L.combineTemplate({
    text: textAtom,
    selected
  }).pipe(L.map(({ text, selected }: { text: string, selected: boolean }) => selected ? `postit-selected-${text}` : `postit-${text}`))

  const setEditingIfAllowed = (e: boolean) => {
    const l = locks.get()
    const u = userId.get()

    if (!u) return
    if (l[id] && l[id] !== u) return
    focus.set(e ? { status: "editing", id } : { status: "selected", ids: [id] })

    !l[id] && dispatch({ action: "item.lock", boardId: board.get().id, itemId: id })
  }

  return (
    <span
      ref={ref}
      draggable={true}
      onPointerDown={onClick}
      onContextMenu={onContextMenu}
      data-test={dataTest}
      className={L.view(selected, s => s ? "postit selected" : "postit")}
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
              setEditingIfAllowed
          )
        }} />
        { showCoords ? <small>{L.view(postIt, p => Math.floor(p.x) + ", " + Math.floor(p.y))}</small> : null}
      </span>
      { L.view(locks, l => l[id] && l[id] !== userId.get() ? <span className="lock">🔒</span> : null )}
      { L.view(selected, s => s ? <SelectionBorder {...{ id, item: postIt, coordinateHelper, board, focus, dispatch}}/> : null) }
    </span>
  );
};