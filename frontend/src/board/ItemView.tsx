import { h } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { getSelectedIds } from "./board-focus"
import { Board, Note, Item, Text, ItemType, TextItem, BoardHistoryEntry, Id, getItemIds } from "../../../common/src/domain";
import { EditableSpan } from "../components/EditableSpan"
import { BoardFocus } from "./board-focus";
import { SelectionBorder } from "./SelectionBorder"
import { DragBorder } from "./DragBorder"
import { itemDragToMove } from "./item-dragmove"
import { itemSelectionHandler } from "./item-selection";
import { Dispatch } from "./board-store";
import { contrastingColor } from "./contrasting-color";
import _, { size } from "lodash";
import { Dimensions } from "./geometry";

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
      data-itemid={id}
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
      { type === "note" && <AuthorInfo {...{ item, itemHistory }}/> }
    </span>
  );

  function TextView({ item } : { item: L.Property<TextItem>} ) {
    const textAtom = L.atom(L.view(item, "text"), text => dispatch({ action: "item.update", boardId: board.get().id, items: [{ ...item.get(), text }] }))
    const showCoords = false
  

    const focused = L.view(focus, f => getSelectedIds(f).has(id))

    const fontSize = L.view(L.view(item, "type"), L.view(item, "width"), L.view(item, "height"), L.view(item, "text"), focused, (t, w, h, text, f) => {
      if (t !== "note") return "1em";
      
      const words = text.split(/\s/).map(s => s.trim()).filter(s => s).map(s => getTextDimensions(s, referenceFont!))
      const spaceCharSize = getTextDimensions("", referenceFont!)         
      const widthTarget = coordinateHelper.emToPx(w) * 0.7
      const heightTarget = coordinateHelper.emToPx(h) * 0.6

      const maxWidth = widthTarget
      const lineSpacingEm = 0.4

      let lowerBound = 0
      let upperBound = 10
      let sizeEm = 1
      if (words.length > 0) {
        let iterations = 1
        while (iterations < 10) { // Limited binary search
            const fitInfo = tryFit(sizeEm)
            const fitFactor = fitInfo.fitFactor
            //if (f) console.log(text, "Try size", sizeEm, "Total lines", fitInfo.lines.length, "V-Fit", fitInfo.heightFitFactor, "H-fit", fitInfo.widthFitFactor, "limited by", fitFactor === fitInfo.heightFitFactor ? "height" : "width")
            
            if (fitFactor < 0.95) {
              // too small
              lowerBound = sizeEm
              sizeEm = (sizeEm + upperBound) / 2
            } else if (fitFactor > 1) {
              // too big
              upperBound = sizeEm
              sizeEm = (sizeEm + lowerBound) / 2
            } else {
              // Good enough
              break
            }
            iterations++          
        }
      }

      return sizeEm + "em"

      // Try to fit text using given font size. Return fit factor (text size / max size)
      function tryFit(sizeEm: number) {
        let index = 0
        let lines: Dimensions[] = []
        let maxWordWidth = 0
        let lineWidth = 0

        while(true) { // loop through lines
          let nextWord = words[index]
          let nextWordWidth = nextWord.width * sizeEm
          maxWordWidth = Math.max(nextWordWidth, maxWordWidth)
          let nextWordWidthWithSpacing = (lineWidth == 0 ? nextWord.width : nextWord.width + spaceCharSize.width) * sizeEm
          let fitFactor = (lineWidth + nextWordWidthWithSpacing) / maxWidth
          if (fitFactor > 1) {
            // no more words for this line
            if (lineWidth === 0) {
              //if (f) console.log("couldn't fit a single word, return factor based on width")              
              return { lines: [], fitFactor, widthFitFactor: fitFactor, heightFitFactor: 0 }
            } else {
              lines.push({ width: lineWidth, height: nextWord.height * sizeEm })
              lineWidth = 0;
            }            
          } else {
            // add this word on the line            
            lineWidth = lineWidth + nextWordWidthWithSpacing            
            if (++index >= words.length) {
              //if (f) console.log("All words added", words)
              lines.push({ width: lineWidth, height: nextWord.height * sizeEm })
              lineWidth = 0
              break
            }
          }
        }
        // At this point the text was horizontally fit. Return fit factor based on height
        const totalHeight = lines.reduce((h, l) => h + l.height, 0) + (lines.length - 1) * lineSpacingEm * sizeEm
        const heightFitFactor = totalHeight / heightTarget
        const widthFitFactor = maxWordWidth / widthTarget
        const fitFactor = Math.max(heightFitFactor, widthFitFactor)
        return { lines, fitFactor, heightFitFactor, widthFitFactor, totalHeight, lineCount: lines.length }
      }
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

  function AuthorInfo({item, itemHistory}: {item: L.Property<Item>, itemHistory: BoardHistoryEntry[]}) {
    const color = L.view(item, i => i.type === "note" ? i.color : "white", contrastingColor)
    const style = L.combineTemplate({ color })    
    const interestingHistory = itemHistory.filter(e => e.action !== "item.move" && e.action !== "item.front")
    const lastItem = interestingHistory[interestingHistory.length - 1]
    return <span className="author" style={style}>{lastItem && lastItem.user.userType !== "system" ? lastItem.user.nickname : null}</span>
  }
};

export function getTextDimensions(text: string, font: string): Dimensions {
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

function findItemHistory(history: BoardHistoryEntry[], id: Id): BoardHistoryEntry[] {
  return history.filter(e => getItemIds(e).includes(id))
}
