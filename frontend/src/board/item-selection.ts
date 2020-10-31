import * as H from "harmaja";
import { h } from "harmaja";
import * as L from "lonna";
import { AppEvent, Board, Id, ItemLocks } from "../../../common/domain";
import { BoardFocus } from "./BoardView";
import { ContextMenu, HIDDEN_CONTEXT_MENU } from "./ContextMenuView"

export function itemSelectionHandler(
  id: string,
  focus: L.Atom<BoardFocus>,
  contextMenu: L.Atom<ContextMenu>,
  board: L.Property<Board>,
  userId: L.Property<Id | null>,
  locks: L.Property<ItemLocks>,
  dispatch: (e: AppEvent) => void
) {
    const itemFocus = L.view(focus, f => {
        if (f.status === "none") return "none"
        if (f.status === "selected") return f.ids.has(id) ? "selected" : "none"
        if (f.status === "dragging") return f.ids.has(id) ? "dragging" : "none"
        return f.id === id ? "editing" : "none"
    })

    itemFocus.forEach(f => {
      const user = userId.get()
      if (!user) return
      const l = locks.get()
      if (f === "none" && l[id] && l[id] === userId.get()) {
        dispatch({ action: "item.unlock", boardId: board.get().id, itemId: id })    
      }
    })

    const selected = L.view(itemFocus, s => s !== "none")

    function onClick(e: JSX.MouseEvent) {
        const l = locks.get()
        const user = userId.get()
        const canOperate = !l[id] || l[id] === user
        if (!user || !canOperate) return

        contextMenu.set(HIDDEN_CONTEXT_MENU)
        const f = focus.get()
        
        if (e.shiftKey && f.status === "selected") {
            if (f.ids.has(id) ) {
                focus.set({ status: "selected", ids: new Set([...f.ids].filter(i => i !== id))})
            } else {
                focus.set({ status: "selected", ids: new Set([...f.ids].concat(id))})
                lockAndBringToFront(id)
            }
        } else if (f.status === "none") {
            focus.set({ status: "selected", ids: new Set([id]) })
            lockAndBringToFront(id)
        } else if (f.status === "selected" && !f.ids.has(id)) {
            focus.set({ status: "selected", ids: new Set([id]) })
            lockAndBringToFront(id)
        }      
      }    

    return {
        itemFocus,
        selected,
        onClick
    }

    function lockAndBringToFront(id: Id) {
      dispatch({ action: "item.lock", boardId: board.get().id, itemId: id })             
      dispatch({ action: "item.front", boardId: board.get().id, itemId: id })
    }
}