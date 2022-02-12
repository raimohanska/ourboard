import { HarmajaChild, HarmajaOutput } from "harmaja"
import { Board, findItem, Id, Item } from "../../../common/src/domain"
import { getItem } from "../../../common/src/domain"
import { difference } from "../../../common/src/sets"

export type BoardFocus =
    | { status: "none" }
    | { status: "selected"; ids: Set<Id> }
    | { status: "dragging"; ids: Set<Id> }
    | { status: "connection-selected"; ids: Set<Id> }
    | { status: "editing"; id: Id }
    | { status: "adding"; element: HarmajaChild; item: Item }
    | { status: "connection-adding" }

export function getSelectedItemIds(f: BoardFocus): Set<Id> {
    switch (f.status) {
        case "none":
        case "adding":
        case "connection-adding":
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
    return [...getSelectedItemIds(f)].flatMap((id) => findItem(b)(id) || [])
}

export const getSelectedItem = (b: Board) => (f: BoardFocus): Item | null => {
    return getSelectedItems(b)(f)[0] || null
}

export function removeFromSelection(selection: BoardFocus, toRemove: Set<Id>): BoardFocus {
    switch (selection.status) {
        case "adding":
        case "none":
        case "connection-adding":
            return selection
        case "editing":
            return toRemove.has(selection.id) ? { status: "none" } : selection
        case "dragging":
        case "connection-selected":
        case "selected":
            selection = { ...selection, ids: difference(selection.ids, toRemove) }
            return selection.ids.size > 0 ? selection : { status: "none" }
    }
}

export function removeNonExistingFromSelection(selection: BoardFocus, existing: Set<Id>): BoardFocus {
    const nonExistent = difference(getSelectedItemIds(selection), existing)
    return removeFromSelection(selection, nonExistent)
}
