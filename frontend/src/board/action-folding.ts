import { AppEvent, MoveItem, UpdateItem } from "../../../common/domain"

function findEquivalent(event: AppEvent, q: AppEvent[]) {
    if (event.action === "cursor.move") {
        return q.findIndex(evt => evt.action === "cursor.move")
    }
    else if (event.action === "item.move") {
        return q.findIndex(evt => evt.action === "item.move" && evt.boardId === event.boardId && everyItemMatches(evt, event))
    }
    else if (event.action === "item.update") {
        return q.findIndex(evt => evt.action === "item.update" && evt.boardId === event.boardId && everyItemMatches(evt, event))                
    }
    else if (event.action === "item.lock" || event.action === "item.unlock") {
        return q.findIndex(evt => evt.action === event.action && evt.boardId === event.boardId && evt.itemId === event.itemId)                
    } 

    return -1
}

export function addOrReplaceEvent(event: AppEvent, q: AppEvent[]) {
    const idx = findEquivalent(event, q)
    if (idx === -1) {
        return q.concat(event)
    }
    return [...q.slice(0, idx), event, ...q.slice(idx+1)]
}

export function addIfNotExists(event: AppEvent, b:AppEvent[]) {
    const idx = findEquivalent(event, b)
    if (idx === -1) {
        return b.concat(event)
    }
    return b
}

function everyItemMatches(evt: MoveItem | UpdateItem, evt2: MoveItem | UpdateItem) {
    return evt.items.length === evt2.items.length && evt.items.every((it, ind) => evt2.items[ind].id === it.id)
}