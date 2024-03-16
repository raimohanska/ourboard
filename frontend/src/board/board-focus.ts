import { HarmajaChild } from "harmaja"
import { Board, Connection, findConnection, findItem, Id, Item } from "../../../common/src/domain"
import { difference, emptySet } from "../../../common/src/sets"

export type BoardFocus =
    | { status: "none" }
    | { status: "selected"; itemIds: Set<Id>; connectionIds: Set<Id> }
    | { status: "dragging"; itemIds: Set<Id>; connectionIds: Set<Id> }
    | { status: "editing"; itemId: Id }
    | { status: "adding"; element: HarmajaChild; item: Item }
    | { status: "connection-adding" }

export function getSelectedItemIds(f: BoardFocus): Set<Id> {
    switch (f.status) {
        case "none":
        case "adding":
        case "connection-adding":
            return emptySet()
        case "editing":
            return new Set([f.itemId])
        case "selected":
        case "dragging":
            return f.itemIds
    }
}

export function getSelectedConnectionIds(f: BoardFocus): Set<Id> {
    switch (f.status) {
        case "none":
        case "adding":
        case "editing":
        case "connection-adding":
            return emptySet()
        case "dragging":
        case "selected":
            return f.connectionIds
    }
}

export const getSelectedItems = (b: Board) => (f: BoardFocus): Item[] => {
    return [...getSelectedItemIds(f)].flatMap((id) => findItem(b)(id) || [])
}

export const getSelectedConnections = (b: Board) => (f: BoardFocus): Connection[] => {
    return [...getSelectedConnectionIds(f)].flatMap((id) => findConnection(b)(id) || [])
}

export const getSelectedItem = (b: Board) => (f: BoardFocus): Item | null => {
    return getSelectedItems(b)(f)[0] || null
}

export const isAnythingSelected = (f: BoardFocus) =>
    getSelectedConnectionIds(f).size > 0 || getSelectedItemIds(f).size > 0

export function removeFromSelection(
    selection: BoardFocus,
    toRemoveItems: Set<Id>,
    toRemoveConnections: Set<Id>,
): BoardFocus {
    switch (selection.status) {
        case "adding":
        case "none":
        case "connection-adding":
            return selection
        case "editing":
            return toRemoveItems.has(selection.itemId) ? noFocus : selection
        case "dragging":
        case "selected":
            selection = {
                ...selection,
                itemIds: difference(selection.itemIds, toRemoveItems),
                connectionIds: difference(selection.connectionIds, toRemoveConnections),
            }
            return selection.itemIds.size + selection.connectionIds.size > 0 ? selection : noFocus
    }
}

export function removeNonExistingFromSelection(selection: BoardFocus, board: Board): BoardFocus {
    const toRemoveItems = new Set(
        [...getSelectedItemIds(selection)].filter((id) => {
            if (!board.items[id]) return true
            if (board.items[id].hidden) return true
        }),
    )
    const selectedConnectionIds = getSelectedConnectionIds(selection)
    const toRemoveConnections =
        selectedConnectionIds.size > 0
            ? difference(selectedConnectionIds, new Set(board.connections.filter((c) => !c.hidden).map((c) => c.id)))
            : emptySet<Id>()
    return removeFromSelection(selection, toRemoveItems, toRemoveConnections)
}

export const noFocus: BoardFocus = { status: "none" }
