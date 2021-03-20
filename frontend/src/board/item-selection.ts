import { h } from "harmaja"
import * as L from "lonna"
import { Board } from "../../../common/src/domain"
import { Dispatch } from "../store/server-connection"
import { BoardFocus, getSelectedIds } from "./board-focus"

export function itemSelectionHandler(
    id: string,
    focus: L.Atom<BoardFocus>,
    board: L.Property<Board>,
    dispatch: Dispatch,
) {
    const itemFocus = L.view(focus, (f) => {
        if (f.status === "none") return "none"
        if (f.status === "selected") return f.ids.has(id) ? "selected" : "none"
        if (f.status === "dragging") return f.ids.has(id) ? "dragging" : "none"
        return f.id === id ? "editing" : "none"
    })

    const selected = L.view(itemFocus, (s) => s !== "none")

    function onClick(e: JSX.MouseEvent) {
        const f = focus.get()
        console.log("Item click", f.status)
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
        } else if (f.status === "selected") {
            focus.set({ status: "editing", id })
        }
    }

    return {
        itemFocus,
        selected,
        onClick,
    }
}
