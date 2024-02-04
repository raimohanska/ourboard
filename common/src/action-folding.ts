import _ from "lodash"
import { arrayEquals, arrayIdAndKeysMatch, arrayIdMatch, idsOf } from "./arrays"
import { boardReducer } from "./board-reducer"
import {
    actionNamespaceIs,
    AppEvent,
    BoardHistoryEntry,
    CURSOR_POSITIONS_ACTION_TYPE,
    getItem,
    getItemIds,
    isBoardHistoryEntry,
    isPersistableBoardItemEvent,
    isSameUser,
    MoveItem,
    newBoard,
} from "./domain"

type FoldOptions = {
    cursorsAndBatchingOnly?: boolean
    foldAddUpdate: boolean
}

const defaultOptions = {
    foldAddUpdate: true,
    cursorsAndBatchingOnly: false,
}

export const CURSORS_AND_BATCHING: FoldOptions = { cursorsAndBatchingOnly: true, foldAddUpdate: false }

// TODO: Serial skips were observed when making local changes
// TODO: The lag still accumulates. Could try mutative mode.

export function foldActions(a: AppEvent, b: AppEvent, options: FoldOptions = defaultOptions): AppEvent | null {
    if (a.action === "ui.batchupdate" && isBoardHistoryEntry(b) && options.cursorsAndBatchingOnly) {
        return {
            action: "ui.batchupdate",
            boardId: a.boardId,
            updates: [...a.updates, b],
        }
    } else if (isBoardHistoryEntry(a) && isBoardHistoryEntry(b)) {
        if (options.cursorsAndBatchingOnly) {
            return {
                action: "ui.batchupdate",
                boardId: a.boardId,
                updates: [a, b],
            }
        }
        if (!isSameUser(a.user, b.user)) return null
        const folded = foldActions_(a, b, options)
        if (!folded) return null
        const firstSerial = a.firstSerial ? a.firstSerial : a.serial
        const serial = b.serial
        return { ...(folded as BoardHistoryEntry), serial, firstSerial } as BoardHistoryEntry
    } else {
        return foldActions_(a, b, options)
    }
}
/*
Folding can be done if in any given state S, applying actions A and B consecutively can be replaced with a single action C.
This function should return that composite action or null if folding is not possible.
*/
function foldActions_(a: AppEvent, b: AppEvent, options: FoldOptions = defaultOptions): AppEvent | null {
    if (a.action === CURSOR_POSITIONS_ACTION_TYPE && b.action === CURSOR_POSITIONS_ACTION_TYPE) {
        return b
    }
    if (a.action === "cursor.move" && b.action === "cursor.move" && b.boardId === a.boardId) {
        return b // This is a local cursor move
    }
    if (options.cursorsAndBatchingOnly) return null

    if (isBoardHistoryEntry(a) && isBoardHistoryEntry(b)) {
        if (!isSameUser(a.user, b.user)) return null
    }
    if (options.foldAddUpdate && a.action === "item.add") {
        if (
            isPersistableBoardItemEvent(b) &&
            b.action !== "item.delete" &&
            !actionNamespaceIs("connection", b) && // Notice that getItemIds is empty for connection events and thus the function would attempt to fold them with the item.add.
            a.boardId === b.boardId
        ) {
            const createdItemIds = new Set(getItemIds(a))
            if (getItemIds(b).every((id) => createdItemIds.has(id))) {
                try {
                    let tmp = newBoard("tmp")
                    if (isBoardHistoryEntry(a) && a.serial !== undefined) {
                        tmp.serial = a.serial - 1
                    }
                    const [tmp2] = boardReducer(tmp, a)
                    const [tmp3] = boardReducer(tmp2, b)
                    const updatedItems = a.items.map((i) => i.id).map(getItem(tmp3))
                    return { ...a, items: updatedItems }
                } catch (e) {
                    console.error("Failed to combine add+modify", a, b, e)
                    return null
                }
            }
        }
    } else if (a.action === "item.front") {
        if (b.action === "item.front" && b.boardId === a.boardId && arrayEquals(b.itemIds, a.itemIds)) return b
    } else if (a.action === "item.move") {
        if (b.action === "item.move" && b.boardId === a.boardId && everyMovedItemMatches(b, a)) return b
    } else if (a.action === "item.update") {
        if (
            b.action === "item.update" &&
            b.boardId === a.boardId &&
            arrayIdAndKeysMatch(b.items, a.items) &&
            arrayIdAndKeysMatch(b.connections ?? [], a.connections ?? [])
        ) {
            return b
        }
    } else if (a.action === "item.lock" || a.action === "item.unlock") {
        if (b.action === a.action && b.boardId === a.boardId && b.itemId === a.itemId) return b
    } else if (a.action === "connection.modify" && b.action === "connection.modify") {
        if (arrayIdMatch(a.connections, b.connections)) return b
    } else if (a.action === "connection.modify" && b.action === "connection.delete") {
        if (arrayEquals(b.connectionIds, idsOf(a.connections))) return b
    }
    return null
}

function everyMovedItemMatches(evt: MoveItem, evt2: MoveItem) {
    return arrayIdMatch(evt.items, evt2.items) && arrayIdMatch(evt.connections, evt2.connections)
}

export function foldEventList<E extends AppEvent>(events: E[], options: FoldOptions = defaultOptions): E[] {
    const [cursorEvents, otherEvents] = _.partition(events, (e) => e.action === CURSOR_POSITIONS_ACTION_TYPE)
    const lastCursorEvent = cursorEvents.length ? [cursorEvents[cursorEvents.length - 1]] : []
    const foldedOtherEvents = events.reduce((folded, next) => addOrReplaceEvent(next, folded, options), [] as E[])
    if (lastCursorEvent.length > cursorEvents.length) {
        console.log("Cursors", cursorEvents.length, " -> 1")
    }
    return [...foldedOtherEvents, ...lastCursorEvent]
}

export function addOrReplaceEvent<E extends AppEvent>(event: E, q: E[], options: FoldOptions = defaultOptions): E[] {
    for (let i = 0; i < q.length; i++) {
        let eventInQueue = q[i]
        const folded = foldActions(eventInQueue, event, options)
        if (folded) {
            return [...q.slice(0, i), folded, ...q.slice(i + 1)] as E[]
        }
    }
    return q.concat(event)
}
