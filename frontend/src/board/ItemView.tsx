import * as H from "harmaja";
import { h } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { AppEvent, Board, Id, PostIt, ItemLocks, Item } from "../../../common/domain";
import { EditableSpan } from "../components/components"
import { BoardFocus } from "./BoardView";
import { ContextMenu } from "./ContextMenuView"
import { SelectionBorder } from "./SelectionBorder"
import { itemDragToMove } from "./item-dragmove"
import { itemSelectionHandler } from "./item-selection";

export const ItemView = (
    { board, id, type, item, locks, userId, focus, coordinateHelper, dispatch, contextMenu }:
    {  
        board: L.Property<Board>, id: string; type: string, item: L.Property<Item>,
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

  const dataTest = L.combineTemplate({
    text: L.view(item, i => i.type === "note" ? i.text : ""),
    selected
  }).pipe(L.map(({ text, selected }: { text: string, selected: boolean }) => selected ? `postit-selected-${text}` : `postit-${text}`))


  return (
    <span
      ref={ref}
      data-test={dataTest}
      draggable={true}
      onPointerDown={onClick}
      onContextMenu={onContextMenu}
      className={L.view(selected, s => s ? type + " selected" : type)}
      style={item.pipe(L.map((p: Item) => ({
        top: p.y + "em",
        left: p.x + "em",
        height: p.height + "em",
        width: p.width + "em",
        background: p.type === "note" ? p.color : "none",
        position: "absolute"
      })))}      
    >
      { type === "note" ? <TextView postIt={item as L.Property<PostIt>}/> : null }
      { L.view(locks, l => l[id] && l[id] !== userId.get() ? <span className="lock">🔒</span> : null )}
      { L.view(selected, s => s ? <SelectionBorder {...{ id, item: item, coordinateHelper, board, focus, dispatch}}/> : null) }
    </span>
  );

  function TextView({ postIt } : { postIt: L.Property<PostIt>} ) {
    const textAtom = L.atom(L.view(postIt, "text"), text => dispatch({ action: "item.update", boardId: board.get().id, item: { ...postIt.get(), text } }))
    const showCoords = false
  
    
    const setEditingIfAllowed = (e: boolean) => {
      const l = locks.get()
      const u = userId.get()
  
      if (!u) return
      if (l[id] && l[id] !== u) return
      focus.set(e ? { status: "editing", id } : { status: "selected", ids: [id] })
  
      !l[id] && dispatch({ action: "item.lock", boardId: board.get().id, itemId: id })
    }
  
    return <span className="text">
      <EditableSpan {...{
        value: textAtom, editingThis: L.atom(
            L.view(itemFocus, f => f === "editing"),
            setEditingIfAllowed
        )
      }} />
      { showCoords ? <small>{L.view(postIt, p => Math.floor(p.x) + ", " + Math.floor(p.y))}</small> : null}
    </span>
  }
};