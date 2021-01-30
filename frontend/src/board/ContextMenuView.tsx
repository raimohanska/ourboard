import {h} from "harmaja"
import * as L from "lonna"
import _ from "lodash"
import {Board, Color, Item, Note} from "../../../common/src/domain"
import { Dispatch } from "../store/board-store"
import { NOTE_COLORS } from "./PaletteView"
import { BoardFocus, getSelectedIds } from "./board-focus"
import { getItem } from "../../../common/src/state"

export const ContextMenuView = (
  { latestNote, dispatch, board, focus }:
  { latestNote: L.Atom<Note>, dispatch: Dispatch, board: L.Property<Board>, focus: L.Property<BoardFocus> }
) => {

  function setColor(color: Color) {
    const f = focus.get();
    const b = board.get();
    latestNote.modify(n => ({...n, color }))

    const updated = [...getSelectedIds(f)].flatMap(id => {
      const current = getItem(b)(id)
      if (current.type === "note") {
        return { ...current, color } as Item
      }
      return []
    })

    dispatch({ action: "item.update", boardId: b.id, items: updated  });
  }

  const focusedItems = L.view(focus, f => {
    switch (f.status) {
      case "dragging": return []
      case "editing": return [f.id]
      case "none": return []
      case "selected": return [...f.ids]
    }
  }, ids => ids.map(getItem(board.get())));

  const focusItem = L.view(focusedItems, items => {
    if (items.length === 0) return null
    return { 
      x: _.mean(items.map(i => i.x)),
      y: _.min(items.map(i => i.y))
    }
  })
  
  return L.view(focusItem, p => p === null, hide => hide ? null : (
    <div className="context-menu-positioner" style={L.combineTemplate({
      left: L.view(focusItem, p => p ? p.x + "em" : 0),
      top: L.view(focusItem, p => p ? p.y + "em" : 0)
    })}>
    <div className="context-menu">      
      <div className="colors">
        {NOTE_COLORS.map(color => {
          return <span className="color" style={{background: color}} onClick={() => setColor(color)}/>            
        })}
      </div>
      
    </div>
    </div>
  ))
}