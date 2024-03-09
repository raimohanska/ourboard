import { arrayEquals, arrayIdAndKeysMatch, arrayIdMatch, idsOf } from "./arrays"
import {
    AppEvent,
    BoardHistoryEntry,
    CURSOR_POSITIONS_ACTION_TYPE,
    MoveItem,
    isBoardHistoryEntry,
    isSameUser,
} from "./domain"

type FoldOptions = {
    cursorsOnly?: boolean
}

const defaultOptions = {
    foldAddUpdate: true,
    cursorsOnly: false,
}

export const CURSORS_ONLY: FoldOptions = { cursorsOnly: true }

export function foldActions(a: AppEvent, b: AppEvent, options: FoldOptions = defaultOptions): AppEvent | null {
    if (isBoardHistoryEntry(a) && isBoardHistoryEntry(b)) {
        if (options.cursorsOnly) return null
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
export function foldActions_(a: AppEvent, b: AppEvent, options: FoldOptions = defaultOptions): AppEvent | null {
    if (a.action === CURSOR_POSITIONS_ACTION_TYPE && b.action === CURSOR_POSITIONS_ACTION_TYPE) {
        return b
    }
    if (a.action === "cursor.move" && b.action === "cursor.move" && b.boardId === a.boardId) {
        return b // This is a local cursor move
    }
    if (options.cursorsOnly) return null

    if (isBoardHistoryEntry(a) && isBoardHistoryEntry(b)) {
        if (!isSameUser(a.user, b.user)) return null
    }
    if (a.action === "item.front") {
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
