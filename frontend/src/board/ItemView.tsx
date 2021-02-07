import { h } from "harmaja";
import * as L from "lonna";
import { Board, BoardHistoryEntry, getItemIds, Id, Item, ItemType, TextItem } from "../../../common/src/domain";
import { HTMLEditableSpan } from "../components/HTMLEditableSpan";
import { autoFontSize } from "./autoFontSize";
import { BoardCoordinateHelper } from "./board-coordinates";
import { BoardFocus, getSelectedIds } from "./board-focus";
import { Dispatch } from "../store/board-store";
import { contrastingColor } from "./contrasting-color";
import { DragBorder } from "./DragBorder";
import { itemDragToMove } from "./item-dragmove";
import { itemSelectionHandler } from "./item-selection";
import { SelectionBorder } from "./SelectionBorder";

export const ItemView = (
    { board, history, id, type, item, isLocked, focus, coordinateHelper, dispatch }:
    {  
        board: L.Property<Board>, history: L.Property<BoardHistoryEntry[]>, id: string; type: string, item: L.Property<Item>,
        isLocked: L.Property<boolean>,
        focus: L.Atom<BoardFocus>,
        coordinateHelper: BoardCoordinateHelper, dispatch: Dispatch
    }
) => {
  const itemHistory = findItemHistory(history.get(), id) // Purposefully fixing to the first snapshot of history instead of reacting to changes. Would be a performance disaster most likely.
  const element = L.atom<HTMLElement | null>(null)
  
  const ref = (el: HTMLElement) => {
     type !== "container" && itemDragToMove(id, board, focus, coordinateHelper, dispatch)(el)
     element.set(el)
  }

  const { itemFocus, selected, onClick } = itemSelectionHandler(id, focus, board, dispatch)

  const dataTest = L.combineTemplate({
    text: L.view(item, i => i.type === "note" || i.type === "text" ? i.text : ""),
    type: L.view(item, "type"),
    selected
  }).pipe(L.map(({ text, selected, type }: { text: string, selected: boolean, type: ItemType }) => {
    const textSuffix = text ? "-" + text : ""
    return selected ? `${type}-selected${textSuffix}` : `${type}${textSuffix}`
  }))


  return (
    <span
      ref={ref}
      data-test={dataTest}
      data-itemid={id}
      draggable={L.view(itemFocus, f => f !== "editing")}
      onClick={onClick}
      className={L.view(selected, s => s ? type + " selected" : type)}
      style={item.pipe(L.map((p: Item) => ({
        top: p.y + "em",
        left: p.x + "em",
        height: p.height + "em",
        width: p.width + "em",
        zIndex: p.z,
        background: p.type === "note" ? p.color : "none",
        position: "absolute"        
      })))}      
    >
      { (type === "note" || type === "text" || type === "container") && <TextView item={item as L.Property<TextItem>}/>}
      { L.view(isLocked, l => l && <span className="lock">🔒</span>)}
      { L.view(selected, s => s && <SelectionBorder {...{ id, item: item, coordinateHelper, board, focus, dispatch}}/>)}
      { type === "container" && <DragBorder {...{ id, board, coordinateHelper, focus, dispatch }}/>}
      { type === "note" && <AuthorInfo {...{ item, itemHistory }}/> }
    </span>
  );

  function TextView({ item } : { item: L.Property<TextItem>} ) {
    const textAtom = L.atom(L.view(item, "text"), text => dispatch({ action: "item.update", boardId: board.get().id, items: [{ ...item.get(), text }] }))
    const showCoords = false
    const focused = L.view(focus, f => getSelectedIds(f).has(id))

    const setEditing = (e: boolean) => {
      dispatch({ action: "item.front", boardId: board.get().id, itemIds: [id] })
      focus.set(e ? { status: "editing", id } : { status: "selected", ids: new Set([id]) })
    }
    const color = L.view(item, i => i.type === "note" ? i.color : "white", contrastingColor)
    const fontSize = autoFontSize(item, L.view(item, "text"), focused, coordinateHelper, element)
    return <span className="text" style={ L.combineTemplate({fontSize, color}) }>
      <HTMLEditableSpan {...{
        value: textAtom, editingThis: L.atom(
            L.view(itemFocus, f => f === "editing"),
            setEditing
        )
      }} />
      { showCoords && <small>{L.view(item, p => Math.floor(p.x) + ", " + Math.floor(p.y))}</small>}
    </span>
  }

  function AuthorInfo({item, itemHistory}: {item: L.Property<Item>, itemHistory: BoardHistoryEntry[]}) {
    const color = L.view(item, i => i.type === "note" ? i.color : "white", contrastingColor)
    const interestingHistory = itemHistory.filter(e => e.action !== "item.move" && e.action !== "item.front")
    const lastItem = interestingHistory[interestingHistory.length - 1]
    const text = lastItem && lastItem.user.userType !== "system" ? lastItem.user.nickname : ""
    const fontSize = autoFontSize(item, L.constant(text), L.constant(false), coordinateHelper, element, { maxFontSize: 0.5, minFontSize: 0.5, maxLines: 1, hideIfNoFit: true, widthTarget: 0.55 })
    const style = L.combineTemplate({ color, fontSize })    
    return <span className="author" style={style}>{text}</span>
  }
};

function findItemHistory(history: BoardHistoryEntry[], id: Id): BoardHistoryEntry[] {
  return history.filter(e => getItemIds(e).includes(id))
}