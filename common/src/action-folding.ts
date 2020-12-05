import { AppEvent, Item, MoveItem, UpdateItem } from "./domain"

export function canFoldActions(a: AppEvent, b: AppEvent) {
    if (a.action === "cursor.move") {
        return b.action === "cursor.move" && b.boardId === a.boardId
    }
    else if (a.action === "item.move") {
        return b.action === "item.move" && b.boardId === a.boardId && everyItemMatches(b, a)
    }
    else if (a.action === "item.update") {
        return b.action === "item.update" && b.boardId === a.boardId && everyItemMatches(b, a)
    }
    else if (a.action === "item.lock" || a.action === "item.unlock") {
        return b.action === a.action && b.boardId === a.boardId && b.itemId === a.itemId            
    } 
    return false
}

function everyItemMatches(evt: MoveItem | UpdateItem, evt2: MoveItem | UpdateItem) {
    return evt.items.length === evt2.items.length && (evt.items as Item[] /* TODO no assertion */).every((it, ind) => evt2.items[ind].id === it.id)
}