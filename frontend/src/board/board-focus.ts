import { HarmajaChild } from "harmaja"
import { Board, findItem, Id, Item } from "../../../common/src/domain"
import { difference, emptySet } from "../../../common/src/sets"

export type BoardFocus =
    | { status: "none" }
    | { status: "selected"; itemIds: Set<Id>; connectionIds: Set<Id> }
    | { status: "dragging"; itemIds: Set<Id> }
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
        case "dragging":
            return emptySet()
        case "selected":
            return f.connectionIds
    }
}

export const getSelectedItems = (b: Board) => (f: BoardFocus): Item[] => {
    return [...getSelectedItemIds(f)].flatMap((id) => findItem(b)(id) || [])
}

export const getSelectedItem = (b: Board) => (f: BoardFocus): Item | null => {
    return getSelectedItems(b)(f)[0] || null
}

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
            return toRemoveItems.has(selection.itemId) ? { status: "none" } : selection
        case "dragging":
            selection = { ...selection, itemIds: difference(selection.itemIds, toRemoveItems) }
            return selection.itemIds.size > 0 ? selection : { status: "none" }
        case "selected":
            selection = {
                ...selection,
                itemIds: difference(selection.itemIds, toRemoveItems),
                connectionIds: difference(selection.connectionIds, toRemoveConnections),
            }
            return selection.itemIds.size + selection.connectionIds.size > 0 ? selection : { status: "none" }
    }
}

export function removeNonExistingFromSelection(
    selection: BoardFocus,
    existingItemIds: Set<Id>,
    existingConnectionIds: Set<Id>,
): BoardFocus {
    const toRemoveItems = difference(getSelectedItemIds(selection), existingItemIds)
    const toRemoveConnections = difference(getSelectedConnectionIds(selection), existingConnectionIds)
    return removeFromSelection(selection, toRemoveItems, toRemoveConnections)
}
