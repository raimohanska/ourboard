import { Board, findItem, Id, Item } from "../../../common/src/domain"
import { getItem } from "../../../common/src/domain"

export type BoardFocus =
    | { status: "none" }
    | { status: "selected"; ids: Set<Id> }
    | { status: "dragging"; ids: Set<Id> }
    | { status: "connection-selected"; id: Id }
    | { status: "editing"; id: Id }

export function getSelectedIds(f: BoardFocus): Set<Id> {
    switch (f.status) {
        case "none":
        case "connection-selected":
            return new Set()
        case "editing":
            return new Set([f.id])
        case "selected":
        case "dragging":
            return f.ids
    }
}

export const getSelectedItems = (b: Board) => (f: BoardFocus): Item[] => {
    return [...getSelectedIds(f)].flatMap((id) => findItem(b)(id) || [])
}

export const getSelectedItem = (b: Board) => (f: BoardFocus): Item | null => {
    return getSelectedItems(b)(f)[0] || null
}

export function removeFromSelection(selection: BoardFocus, toRemove: Set<Id>): BoardFocus {
    switch (selection.status) {
        case "none":
            return selection
        case "editing":
        case "connection-selected":
            return toRemove.has(selection.id) ? { status: "none" } : selection
        case "dragging":
        case "selected":
            selection = { ...selection, ids: difference(selection.ids, toRemove) }
            return selection.ids.size > 0 ? selection : { status: "none" }
    }
}

export function removeNonExistingFromSelection(selection: BoardFocus, existing: Set<Id>): BoardFocus {
    const nonExistent = difference(getSelectedIds(selection), existing)
    return removeFromSelection(selection, nonExistent)
}

function difference<A>(setA: Set<A>, setB: Set<A>) {
    let _difference = new Set(setA)
    for (let elem of setB) {
        _difference.delete(elem)
    }
    return _difference
}
