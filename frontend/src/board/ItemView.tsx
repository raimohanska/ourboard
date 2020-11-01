import * as H from "harmaja";
import { h } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { Board, Id, Note, ItemLocks, Item, Text } from "../../../common/domain";
import { EditableSpan } from "../components/components"
import { BoardFocus } from "./BoardView";
import { ContextMenu } from "./ContextMenuView"
import { SelectionBorder } from "./SelectionBorder"
import { itemDragToMove } from "./item-dragmove"
import { itemSelectionHandler } from "./item-selection";
import { Dispatch } from "./board-store";

export const ItemView = (
    { board, id, type, item, locks, userId, focus, coordinateHelper, dispatch, contextMenu }:
    {  
        board: L.Property<Board>, id: string; type: string, item: L.Property<Item>,
        locks: L.Property<ItemLocks>,
        userId: L.Property<Id | null>,
        focus: L.Atom<BoardFocus>,
        coordinateHelper: BoardCoordinateHelper, dispatch: Dispatch,
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
  }).pipe(L.map(({ text, selected }: { text: string, selected: boolean }) => selected ? `note-selected-${text}` : `note-${text}`))


  return (
    <span
      ref={ref}
      data-test={dataTest}
      draggable={true}
      onClick={onClick}
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
      { (type === "note" || type === "text") ? <TextView item={item as L.Property<Note | Text>}/> : null }
      { L.view(locks, l => l[id] && l[id] !== userId.get() ? <span className="lock">🔒</span> : null )}
      { L.view(selected, s => s ? <SelectionBorder {...{ id, item: item, coordinateHelper, board, focus, dispatch}}/> : null) }
    </span>
  );

  function TextView({ item } : { item: L.Property<Note | Text>} ) {
    const textAtom = L.atom(L.view(item, "text"), text => dispatch({ action: "item.update", boardId: board.get().id, item: { ...item.get(), text } }))
    const showCoords = false
  
    
    const setEditingIfAllowed = (e: boolean) => {
      const l = locks.get()
      const u = userId.get()
  
      if (!u) return
      if (l[id] && l[id] !== u) return
      focus.set(e ? { status: "editing", id } : { status: "selected", ids: new Set([id]) })
  
      !l[id] && dispatch({ action: "item.lock", boardId: board.get().id, itemId: id })
    }
  
    return <span className="text">
      <EditableSpan {...{
        value: textAtom, editingThis: L.atom(
            L.view(itemFocus, f => f === "editing"),
            setEditingIfAllowed
        )
      }} />
      { showCoords ? <small>{L.view(item, p => Math.floor(p.x) + ", " + Math.floor(p.y))}</small> : null}
    </span>
  }
};