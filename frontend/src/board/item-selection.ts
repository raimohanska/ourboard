import { h } from "harmaja";
import * as L from "lonna";
import { Board, Id } from "../../../common/domain";
import { Dispatch } from "./board-store";
import { BoardFocus } from "./synchronize-focus-with-server"

export function itemSelectionHandler(
  id: string,
  focus: L.Atom<BoardFocus>,
  board: L.Property<Board>,
  dispatch: Dispatch
) {
    const itemFocus = L.view(focus, f => {
        if (f.status === "none") return "none"
        if (f.status === "selected") return f.ids.has(id) ? "selected" : "none"
        if (f.status === "dragging") return f.ids.has(id) ? "dragging" : "none"
        return f.id === id ? "editing" : "none"
    })

    const selected = L.view(itemFocus, s => s !== "none")

    function onClick(e: JSX.MouseEvent) {
        const f = focus.get()
        
        if (e.shiftKey && f.status === "selected") {
            if (f.ids.has(id) ) {
                focus.set({ status: "selected", ids: new Set([...f.ids].filter(i => i !== id))})
            } else {
                focus.set({ status: "selected", ids: new Set([...f.ids].concat(id))})
                bringToFront(id)
            }
        } else if (f.status === "none") {
            focus.set({ status: "selected", ids: new Set([id]) })
            bringToFront(id)
        } else if (f.status === "selected" && !f.ids.has(id)) {
            focus.set({ status: "selected", ids: new Set([id]) })
            bringToFront(id)
        }      
      }    

    return {
        itemFocus,
        selected,
        onClick
    }

    function bringToFront(id: Id) {
      dispatch({ action: "item.front", boardId: board.get().id, itemIds: [id] })
    }
}