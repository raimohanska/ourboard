import * as H from "harmaja";
import { h } from "harmaja";
import * as L from "lonna";
import { BoardFocus } from "./BoardView";
import { ContextMenu, HIDDEN_CONTEXT_MENU } from "./ContextMenuView"

export type ItemFocus = "none" | "selected" | "editing"
export function itemSelectionHandler(id: string, focus: L.Atom<BoardFocus>, contextMenu: L.Atom<ContextMenu>) {
    const itemFocus = L.view(focus, f => {
        if (f.status === "none") return "none"
        if (f.status === "selected") return f.ids.includes(id) ? "selected" : "none"
        return f.id === id ? "editing" : "none"
    })
    const selected = L.view(itemFocus, s => s !== "none")

    function onClick(e: JSX.MouseEvent) {
        contextMenu.set(HIDDEN_CONTEXT_MENU)
        const f = focus.get()
          if (e.shiftKey && f.status === "selected") {
            if (f.ids.includes(id)) {
                focus.set({ status: "selected", ids: f.ids.filter(i => i !== id)})    
            } else {
                focus.set({ status: "selected", ids: f.ids.concat(id)})    
            }
          } else {
            focus.set({ status: "selected", ids: [id] })
          }      
      }    

    return {
        itemFocus,
        selected,
        onClick
    }
}