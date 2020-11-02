import {h} from "harmaja"
import * as L from "lonna"
import {Board, Color, Item} from "../../../common/domain"
import { Dispatch } from "./board-store"
import { NOTE_COLORS } from "./PaletteView"
import { BoardFocus } from "./synchronize-focus-with-server"

export const ContextMenuView = (
  { dispatch, board, focus }:
  { dispatch: Dispatch, board: L.Property<Board>, focus: L.Property<BoardFocus> }
) => {

  function setColor(color: Color) {
    const f = focus.get()
    const b = board.get()
    if (f.status === "selected") {
      f.ids.forEach(id => {
        const current = b.items.find(i => i.id === id)
        if (!current) throw Error("Item not found: " + id)
        dispatch({ action: "item.update", boardId: b.id, item: { ...current, color } as Item  }); // TODO: this is post-it specific, not for all Items
      })
    }
  }

  const focusedItems = L.view(focus, f => {
    switch (f.status) {
      case "dragging": return []
      case "editing": return []
      case "none": return []
      case "selected": return [...f.ids]
    }
  }, ids => ids.map(id => board.get().items.find(i => i.id === id)))

  const focusItem = L.view(focusedItems, items => {
    return items.length === 1 && items[0]?.type === "note" ? items[0] : null
  })
  
  return L.view(focusItem, p => p === null, hide => hide ? null : (
    <div
      className="context-menu"
      style={L.combineTemplate({
        left: L.view(focusItem, p => p ? p.x + "em" : 0),
        top: L.view(focusItem, p => p ? p.y + "em" : 0)
      })}>
      
      <div className="colors">
        {NOTE_COLORS.map(color => {
          return <span className="color" style={{background: color}} onClick={() => setColor(color)}/>            
        })}
      </div>
      
    </div>
  ))
}