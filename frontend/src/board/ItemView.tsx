import { h } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { Board, Note, Item, Text, ItemType, TextItem } from "../../../common/src/domain";
import { EditableSpan } from "../components/EditableSpan"
import { BoardFocus } from "./board-focus";
import { SelectionBorder } from "./SelectionBorder"
import { DragBorder } from "./DragBorder"
import { itemDragToMove } from "./item-dragmove"
import { itemSelectionHandler } from "./item-selection";
import { Dispatch } from "./board-store";
import { contrastingColor } from "./contrasting-color";
import _ from "lodash";

export const ItemView = (
    { board, id, type, item, isLocked, focus, coordinateHelper, dispatch }:
    {  
        board: L.Property<Board>, id: string; type: string, item: L.Property<Item>,
        isLocked: L.Property<boolean>,
        focus: L.Atom<BoardFocus>,
        coordinateHelper: BoardCoordinateHelper, dispatch: Dispatch
    }
) => {
  const element = L.atom<HTMLElement | null>(null)
  let referenceFont: string | null = null
  const ref = (el: HTMLElement) => {
     type !== "container" && itemDragToMove(id, board, focus, coordinateHelper, dispatch)(el)
     element.set(el)
     const { fontFamily, fontSize } = getComputedStyle(el)
     referenceFont = `${fontSize} ${fontFamily}` // Firefox returns these properties separately, so can't just use computedStyle.font
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
      draggable={true}
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
    </span>
  );

  function TextView({ item } : { item: L.Property<TextItem>} ) {
    const textAtom = L.atom(L.view(item, "text"), text => dispatch({ action: "item.update", boardId: board.get().id, items: [{ ...item.get(), text }] }))
    const showCoords = false
  
    const fontSize = L.view(L.view(item, "type"), L.view(item, "width"), L.view(item, "height"), L.view(item, "text"), (t, w, h, text) => {
      if (t === "container") return "1em";
      const lines = text.split(/\s/).map(s => s.trim()).filter(s => s).map(s => getTextDimensions(s, referenceFont!))

      const textHeight = _.sum(lines.map(l => l.height))
      const textWidth = _.max(lines.map(l => l.width)) || 0            
      const width = coordinateHelper.emToPx(w)
      const height = coordinateHelper.emToPx(h)

      let size = 0
      for (let wpl = 1; wpl < 20; wpl++) { // try different numbers of words-per-line
        const thisSize = Math.min(width/textWidth/wpl*0.6, height/textHeight*0.8*wpl)
        if (thisSize < size) {
            break
        }
        size = thisSize
      }

      return size + "em"
    })


    const setEditing = (e: boolean) => {
      dispatch({ action: "item.front", boardId: board.get().id, itemIds: [id] })
      focus.set(e ? { status: "editing", id } : { status: "selected", ids: new Set([id]) })
    }
    const color = L.view(item, i => i.type === "note" ? i.color : "white", contrastingColor)
    return <span className="text" style={ L.combineTemplate({fontSize, color}) }>
      <EditableSpan {...{
        value: textAtom, editingThis: L.atom(
            L.view(itemFocus, f => f === "editing"),
            setEditing
        )
      }} />
      { showCoords && <small>{L.view(item, p => Math.floor(p.x) + ", " + Math.floor(p.y))}</small>}
    </span>
  }
};

export function getTextDimensions(text: string, font: string) {
  // if given, use cached canvas for better performance
  // else, create new canvas
  var gtw: any = getTextDimensions
  var canvas: HTMLCanvasElement = gtw.canvas || (gtw.canvas = document.createElement("canvas"));
  var context = canvas.getContext("2d")!;
  context.font = font;
  var metrics = context.measureText(text);
  const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
  const width = metrics.width
  
  return { height, width };
};
