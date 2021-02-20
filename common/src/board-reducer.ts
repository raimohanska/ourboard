import {
    AppEvent,
    Board,
    Id,
    Item,
    getItem,
    findItem,
    findItemIdsRecursively,
    isBoardHistoryEntry,
    PersistableBoardItemEvent,
} from "./domain"

export function boardReducer(
    board: Board,
    event: PersistableBoardItemEvent,
): [Board, PersistableBoardItemEvent | null] {
    if (isBoardHistoryEntry(event) && event.serial && event.serial > board.serial) {
        board = { ...board, serial: event.serial }
    }
    switch (event.action) {
        case "board.rename":
            return [{ ...board, name: event.name }, null]
        case "item.bootstrap":
            //if (board.items.length > 0) throw Error("Trying to bootstrap non-empty board")
            return [{ ...board, items: event.items }, null]
        case "item.add":
            if (board.items.find((i) => event.items.some((a) => a.id === i.id))) {
                throw new Error("Adding duplicate item " + JSON.stringify(event.items))
            }
            return [
                { ...board, items: board.items.concat(event.items) },
                { action: "item.delete", boardId: board.id, itemIds: event.items.map((i) => i.id) },
            ]
        case "item.update":
            return [
                {
                    ...board,
                    items: board.items.map((p) => {
                        const updated = event.items.find((i) => i.id === p.id)
                        if (updated) return updated
                        return p
                    }),
                },
                {
                    action: "item.update",
                    boardId: board.id,
                    items: event.items.map((item) => getItem(board)(item.id)),
                },
            ]
        case "item.move":
            return [
                {
                    ...board,
                    items: event.items.reduce(
                        (itemsBeforeMove, i) => moveItemWithChildren(itemsBeforeMove, i.id, i.x, i.y, i.containerId),
                        board.items,
                    ),
                },
                {
                    action: "item.move",
                    boardId: board.id,
                    items: event.items.map((i) => {
                        const item = getItem(board)(i.id)
                        return { id: i.id, x: item.x, y: item.y, containerId: item.containerId }
                    }),
                },
            ]
        case "item.delete": {
            const idsToDelete = findItemIdsRecursively(event.itemIds, board)
            return [
                {
                    ...board,
                    items: board.items.filter((i) => !idsToDelete.has(i.id)),
                },
                {
                    action: "item.add",
                    boardId: board.id,
                    items: Array.from(idsToDelete).map(getItem(board)), // TODO: the deleted items should be assigned to containers when restoring. This happens now only if the container was removed too
                },
            ]
        }
        case "item.front":
            let maxZ = 0
            let maxZCount = 0
            for (let i of board.items) {
                if (i.z > maxZ) {
                    maxZCount = 1
                    maxZ = i.z
                } else if (i.z === maxZ) {
                    maxZCount++
                }
            }
            const isFine = (item: Item) => {
                return !event.itemIds.includes(item.id) || item.z === maxZ
            }
            if (maxZCount === event.itemIds.length && board.items.every(isFine)) {
                // Requested items already on front
                return [board, null]
            }
            return [
                {
                    ...board,
                    items: board.items.map((i) =>
                        i.type !== "container" && event.itemIds.includes(i.id) ? { ...i, z: maxZ + 1 } : i,
                    ),
                },
                null,
            ] // TODO: return item.back
        default:
            console.warn("Unknown event", event)
            return [board, null]
    }
}

const moveItemWithChildren = (itemsOnBoard: Item[], id: Id, x: number, y: number, containerId: Id | undefined) => {
    const mainItem = itemsOnBoard.find((i) => i.id === id)
    if (mainItem === undefined) {
        console.warn("Moving unknown item", id)
        return itemsOnBoard
    }
    const xDiff = x - mainItem.x
    const yDiff = y - mainItem.y

    function containedByMainItem(i: Item): boolean {
        if (!i.containerId) return false
        if (i.containerId === mainItem!.id) return true
        const parent = findItem(itemsOnBoard)(i.containerId)
        if (i.containerId === i.id) throw Error("Self-contained")
        if (parent == i) throw Error("self parent")
        if (!parent) return false // Don't fail here, because when folding create+move, the action is run in an incomplete board context
        return containedByMainItem(parent)
    }
    const movedItems = new Set(
        itemsOnBoard
            .filter(containedByMainItem)
            .map((i) => i.id)
            .concat(id),
    )

    return itemsOnBoard.map((i) => {
        if (!movedItems.has(i.id)) return i
        const updated = { ...i, x: i.x + xDiff, y: i.y + yDiff }
        return i.id === id ? { ...updated, containerId } : updated
    })
}
