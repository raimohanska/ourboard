import * as L from "lonna"
import { ItemType } from "../../../common/src/domain"
import { BoardFocus, getSelectedIds } from "./board-focus"

export function itemSelectionHandler(id: string, type: ItemType, focus: L.Atom<BoardFocus>) {
    const itemFocus = L.view(focus, (f) => {
        if (f.status === "none") return "none"
        if (f.status === "selected") return f.ids.has(id) ? "selected" : "none"
        if (f.status === "dragging") return f.ids.has(id) ? "dragging" : "none"
        return f.id === id ? "editing" : "none"
    })

    const selected = L.view(itemFocus, (s) => s !== "none")

    function onClick(e: JSX.MouseEvent) {
        const f = focus.get()
        const selectedIds = getSelectedIds(f)
        if (e.shiftKey && (f.status === "selected" || f.status === "editing")) {
            if (selectedIds.has(id)) {
                focus.set({ status: "selected", ids: new Set([...selectedIds].filter((i) => i !== id)) })
            } else {
                focus.set({ status: "selected", ids: new Set([...selectedIds].concat(id)) })
            }
        } else if (f.status === "none" || f.status === "connection-selected") {
            focus.set({ status: "selected", ids: new Set([id]) })
        } else if ((f.status === "selected" || f.status === "editing") && !selectedIds.has(id)) {
            focus.set({ status: "selected", ids: new Set([id]) })
        } else if (f.status === "selected" && (type === "note" || type === "text")) {
            focus.set({ status: "editing", id })
        }
    }

    return {
        itemFocus,
        selected,
        onClick,
    }
}
