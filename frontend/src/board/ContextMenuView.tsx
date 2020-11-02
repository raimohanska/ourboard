import {h} from "harmaja"
import * as L from "lonna"
import {Board, Color, Id, Item} from "../../../common/domain"
import { Dispatch } from "./board-store"
import { NOTE_COLORS } from "./PaletteView"

export const ContextMenuView = (
  { dispatch, board, id }:
  { dispatch: Dispatch, board: L.Property<Board>, id: Id }
) => {

  function setColor(color: Color) {
    const b = board.get()
    const current = b.items.find(i => i.id === id)
    if (!current) throw Error("Item not found: " + id)
    
    dispatch({ action: "item.update", boardId: b.id, item: { ...current, color } as Item  }); // TODO: this is post-it specific, not for all Items
  }
  
  return L.view(board, "items").pipe(L.map((items: Item[]) => items.find(i => i.id === id))).pipe(L.map((item: Item | undefined) => !item ? null : (
    <div data-test="context-menu" className="context-menu">
      <div className="colors">
        {NOTE_COLORS.map(color => {
          return <span className="color" style={{background: color}} onClick={() => setColor(color)}/>            
        })}
      </div>
    </div>
  )))
}