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
    isTextItem,
    TextItem,
    Connection,
    isContainedBy,
    MoveItem,
} from "./domain"
import { arrayToObject } from "./migration"

export function boardReducer(
    board: Board,
    event: PersistableBoardItemEvent,
): [Board, PersistableBoardItemEvent | null] {
    if (isBoardHistoryEntry(event) && event.serial) {
        if (event.serial !== board.serial + 1) {
            console.warn(`Serial skip ${board.serial} -> ${event.serial}`)
        }
        board = { ...board, serial: event.serial }
    }
    switch (event.action) {
        case "connection.add": {
            const { connection } = event
            validateConnection(board, connection)

            if (board.connections.some((c) => c.id === connection.id)) {
                throw Error(`Connection ${connection.id} already exists on board ${board.id}`)
            }

            return [
                { ...board, connections: board.connections.concat(connection) },
                { action: "connection.delete", boardId: event.boardId, connectionId: event.connection.id },
            ]
        }
        case "connection.modify": {
            const { connection } = event
            validateConnection(board, connection)

            const existingConnection = board.connections.find((c) => c.id === connection.id)
            if (!existingConnection) {
                throw Error(`Trying to modify nonexisting connection ${connection.id} on board ${board.id}`)
            }

            return [
                { ...board, connections: board.connections.map((c) => (c === existingConnection ? connection : c)) },
                { action: "connection.modify", boardId: event.boardId, connection: existingConnection },
            ]
        }
        case "connection.delete": {
            const { connectionId } = event

            const existingConnection = board.connections.find((c) => c.id === connectionId)
            if (!existingConnection) {
                throw Error(`Trying to delete nonexisting connection ${connectionId} on board ${board.id}`)
            }

            return [
                { ...board, connections: board.connections.filter((c) => c !== existingConnection) },
                { action: "connection.add", boardId: event.boardId, connection: existingConnection },
            ]
        }
        case "board.rename":
            return [{ ...board, name: event.name }, null]
        case "item.bootstrap":
            //if (board.items.length > 0) throw Error("Trying to bootstrap non-empty board")
            return [{ ...board, items: event.items }, null]
        case "item.add":
            if (event.items.some((a) => board.items[a.id])) {
                throw new Error("Adding duplicate item " + JSON.stringify(event.items))
            }
            const itemsToAdd = event.items.reduce((acc: Record<string, Item>, item) => {
                if (item.containerId && !findItem(board)(item.containerId)) {
                    // Add item but don't try to assign to a non-existing container
                    acc[item.id] = { ...item, containerId: undefined }
                    return acc
                }
                acc[item.id] = item
                return acc
            }, {})
            return [
                { ...board, items: { ...board.items, ...itemsToAdd } },
                { action: "item.delete", boardId: board.id, itemIds: event.items.map((i) => i.id) },
            ]
        case "item.font.increase":
            return [
                {
                    ...board,
                    items: applyFontSize(board.items, 1.1, event.itemIds),
                },
                {
                    ...event,
                    action: "item.font.decrease",
                },
            ]
        case "item.font.decrease":
            return [
                {
                    ...board,
                    items: applyFontSize(board.items, 1 / 1.1, event.itemIds),
                },
                {
                    ...event,
                    action: "item.font.increase",
                },
            ]
        case "item.update": {
            const updated = arrayToObject("id", event.items)
            return [
                {
                    ...board,
                    items: {
                        ...board.items,
                        ...updated,
                    },
                },
                {
                    action: "item.update",
                    boardId: board.id,
                    items: event.items.map((item) => getItem(board)(item.id)),
                },
            ]
        }
        case "item.move":
            return [
                moveItems(board, event),
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

            const connectionsToKeep = board.connections.filter(
                (c) =>
                    (typeof c.from !== "string" || !idsToDelete.has(c.from)) &&
                    (typeof c.to !== "string" || !idsToDelete.has(c.to)),
            )

            const updatedItems = { ...board.items }
            idsToDelete.forEach((id) => {
                delete updatedItems[id]
            })
            return [
                {
                    ...board,
                    connections: connectionsToKeep,
                    items: updatedItems,
                },
                {
                    action: "item.add",
                    boardId: board.id,
                    items: Array.from(idsToDelete).map(getItem(board)),
                },
            ]
        }
        case "item.front":
            let maxZ = 0
            let maxZCount = 0
            const itemsList = Object.values(board.items)
            for (let i of itemsList) {
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
            if (maxZCount === event.itemIds.length && itemsList.every(isFine)) {
                // Requested items already on front
                return [board, null]
            }

            const updated = event.itemIds.reduce((acc: Record<string, Item>, id) => {
                const item = board.items[id]
                const u = item.type !== "container" ? { ...item, z: maxZ + 1 } : item
                acc[u.id] = u
                return acc
            }, {})

            return [
                {
                    ...board,
                    items: {
                        ...board.items,
                        ...updated,
                    },
                },
                null,
            ] // TODO: return item.back
        default:
            console.warn("Unknown event", event)
            return [board, null]
    }
}

function validateConnection(board: Board, connection: Connection) {
    validateEndPoint(board, connection, "from")
    validateEndPoint(board, connection, "to")
}

function validateEndPoint(board: Board, connection: Connection, key: "to" | "from") {
    const endPoint = connection[key]
    if (typeof endPoint === "string") {
        const toItem = board.items[endPoint]
        if (!toItem) {
            throw Error(`Connection ${connection.id} refers to nonexisting item ${endPoint}`)
        }
    }
}

function applyFontSize(items: Record<string, Item>, factor: number, itemIds: Id[]) {
    const updated = itemIds.reduce((acc: Record<string, Item>, id) => {
        const u = items[id] && isTextItem(items[id]) ? (items[id] as TextItem) : null
        if (u) {
            acc[u.id] = {
                ...u,
                fontSize: ((u as TextItem).fontSize || 1) * factor,
            }
        }
        return acc
    }, {})
    return {
        ...items,
        ...updated,
    }
}

function moveItems(board: Board, event: MoveItem) {
    type Move = { xDiff: number; yDiff: number; containerChanged: boolean; containerId: Id | undefined }

    const moves: Record<Id, Move> = {}
    const itemsOnBoard = board.items

    for (let mainItemMove of event.items) {
        const { id, x, y, containerId } = mainItemMove
        const mainItem = itemsOnBoard[id]
        if (mainItem === undefined) {
            console.warn("Moving unknown item", id)
            continue
        }
        const xDiff = x - mainItem.x
        const yDiff = y - mainItem.y

        for (let movedItem of Object.values(itemsOnBoard)) {
            const movedId = movedItem.id
            if (movedId === id || isContainedBy(itemsOnBoard, mainItem)(movedItem)) {
                const move = { xDiff, yDiff, containerChanged: movedId === id, containerId }
                moves[movedId] = move
            }
        }
    }

    const updatedItems = Object.entries(moves).reduce(
        (items, [id, move]) => {
            const item = items[id]
            const updated = { ...item, x: item.x + move.xDiff, y: item.y + move.yDiff }
            if (move.containerChanged) updated.containerId = move.containerId
            items[id] = updated
            return items
        },
        { ...board.items },
    )

    return {
        ...board,
        items: updatedItems,
    }
}
