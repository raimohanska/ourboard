import { partition } from "lodash"
import { maybeChangeContainerForItem } from "../../frontend/src/board/item-setcontainer"
import { arrayToRecordById } from "./arrays"
import { rerouteConnection, resolveEndpoint } from "./connection-utils"
import {
    Board,
    Connection,
    ConnectionEndPoint,
    findItem,
    findItemIdsRecursively,
    getConnection,
    getEndPointItemId,
    getItem,
    Id,
    isBoardHistoryEntry,
    isContainedBy,
    isContainer,
    isItemEndPoint,
    isTextItem,
    Item,
    MoveItem,
    PersistableBoardItemEvent,
    Point,
    TextItem,
} from "./domain"
import { equalRect, Rect } from "./geometry"

export function boardReducer(
    board: Board,
    event: PersistableBoardItemEvent,
): [Board, PersistableBoardItemEvent | null] {
    if (isBoardHistoryEntry(event) && event.serial) {
        const firstSerial = event.firstSerial ? event.firstSerial : event.serial
        if (firstSerial !== board.serial + 1) {
            console.warn(`Serial skip ${board.serial} -> ${event.serial}`)
        }
        board = { ...board, serial: event.serial }
    }
    switch (event.action) {
        case "connection.add": {
            const connections = event.connections

            for (let connection of connections) {
                validateConnection(board, connection)

                if (board.connections.some((c) => c.id === connection.id)) {
                    throw Error(`Connection ${connection.id} already exists on board ${board.id}`)
                }
            }

            return [
                { ...board, connections: [...board.connections, ...connections] },
                { action: "connection.delete", boardId: event.boardId, connectionIds: connections.map((c) => c.id) },
            ]
        }
        case "connection.modify": {
            const connections = event.connections

            const existingConnections = connections.map((r) => {
                validateConnection(board, r)
                const existingConnection = board.connections.find((c) => c.id === r.id)
                if (!existingConnection) {
                    throw Error(`Trying to modify nonexisting connection ${r.id} on board ${board.id}`)
                }
                return existingConnection
            })

            return [
                {
                    ...board,
                    connections: board.connections.map((c) => {
                        const replacement = connections.find((r) => r.id === c.id)
                        return replacement ? replacement : c
                    }),
                },
                { action: "connection.modify", boardId: event.boardId, connections: existingConnections },
            ]
        }
        case "connection.delete": {
            const ids = new Set(event.connectionIds)

            const existingConnections = board.connections.filter((c) => ids.has(c.id))

            return [
                { ...board, connections: board.connections.filter((c) => !ids.has(c.id)) },
                { action: "connection.add", boardId: event.boardId, connections: existingConnections },
            ]
        }
        case "board.rename":
            return [{ ...board, name: event.name }, null]
        case "board.setAccessPolicy":
            return [{ ...board, accessPolicy: event.accessPolicy }, null]
        case "item.bootstrap":
            //if (board.items.length > 0) throw Error("Trying to bootstrap non-empty board")
            return [{ ...board, items: event.items, connections: event.connections }, null]
        case "item.add":
            if (event.items.some((a) => board.items[a.id])) {
                throw new Error("Adding duplicate item " + JSON.stringify(event.items))
            }
            const itemsToAdd = event.items.reduce((acc: Record<string, Item>, item) => {
                if (
                    item.containerId &&
                    !findItem(board)(item.containerId) &&
                    !findItem(arrayToRecordById(event.items))(item.containerId)
                ) {
                    // Add item but don't try to assign to a non-existing container
                    acc[item.id] = { ...item, containerId: undefined }
                    return acc
                }
                acc[item.id] = item
                return acc
            }, {})

            const boardWithAddedItems = { ...board, items: { ...board.items, ...itemsToAdd } }

            const connectionsToAdd = event.connections || []

            connectionsToAdd.forEach((connection) => {
                validateConnection(boardWithAddedItems, connection)

                if (board.connections.some((c) => c.id === connection.id)) {
                    throw Error(`Connection ${connection.id} already exists on board ${board.id}`)
                }
            })

            return [
                { ...boardWithAddedItems, connections: [...board.connections, ...connectionsToAdd] },
                {
                    action: "item.delete",
                    boardId: board.id,
                    itemIds: event.items.map((i) => i.id),
                    connectionIds: event.connections.map((c) => c.id),
                },
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
            return [
                {
                    ...board,
                    items: updateItems(board.items, event.items),
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
                    connections: event.connections.map((c) => {
                        const conn = getConnection(board)(c.id)
                        const startPoint = resolveEndpoint(conn.from, board)
                        return { id: c.id, x: startPoint.x, y: startPoint.y }
                    }),
                },
            ]
        case "item.delete": {
            const itemIdsToDelete = findItemIdsRecursively(event.itemIds, board)
            const connectionIdsToDelete = new Set(event.connectionIds)
            const updatedItems = { ...board.items }
            itemIdsToDelete.forEach((id) => {
                delete updatedItems[id]
            })

            const [connectionsToKeep, connectionsDeleted] = partition(
                board.connections,
                (c) =>
                    !connectionIdsToDelete.has(c.id) &&
                    !(c.containerId && itemIdsToDelete.has(c.containerId)) &&
                    (!isItemEndPoint(c.from) || !itemIdsToDelete.has(getEndPointItemId(c.from))) &&
                    (!isItemEndPoint(c.to) || !itemIdsToDelete.has(getEndPointItemId(c.to))),
            )

            return [
                {
                    ...board,
                    connections: connectionsToKeep,
                    items: updatedItems,
                },
                {
                    action: "item.add",
                    boardId: board.id,
                    items: Array.from(itemIdsToDelete).map(getItem(board)),
                    connections: connectionsDeleted,
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
                if (!item) {
                    console.warn(`Warning: trying to "item.front" nonexisting item ${id} on board ${board.id}`)
                    return acc
                }
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
    if (isItemEndPoint(endPoint)) {
        const toItem = board.items[getEndPointItemId(endPoint)]
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

function updateItems(current: Record<Id, Item>, updateList: Item[]): Record<Id, Item> {
    const updated = arrayToRecordById(updateList)
    const result = { ...current, ...updated }
    updateList.filter(isContainer).forEach((container) => {
        const previous = current[container.id]
        if (previous && !equalRect(previous, container)) {
            // Container shape changed -> check items
            Object.values(current)
                .filter(
                    (i) =>
                        i.containerId === container.id || // Check all previously contained items
                        containedBy(i, container), // Check all items inside the new bounds
                )
                .forEach((item) => {
                    const newContainer = maybeChangeContainerForItem(item, result)
                    if (newContainer?.id !== item.containerId) {
                        result[item.id] = { ...item, containerId: newContainer ? newContainer.id : undefined }
                    }
                })
        }
    })
    return result
}

function moveItems(board: Board, event: MoveItem) {
    const itemMoves: Record<Id, ItemMove> = {}
    const itemsOnBoard = board.items
    const connectionMovesInEvent = event.connections || []

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
                itemMoves[movedId] = move
            }
        }
    }

    const connectionMoves: Record<Id, ConnectionMove> = {}
    for (let connection of board.connections) {
        const move = findConnectionMove(connection, itemMoves, itemsOnBoard)
        if (move) {
            connectionMoves[connection.id] = move
        } else {
            const m = connectionMovesInEvent.find((m) => m.id === connection.id)
            if (m) {
                const startPoint = resolveEndpoint(connection.from, board)
                connectionMoves[connection.id] = {
                    ends: "both",
                    xDiff: m.x - startPoint.x,
                    yDiff: m.y - startPoint.y,
                }
            }
        }
    }

    let connections: Connection[] = board.connections.flatMap((connection) => {
        const move = connectionMoves[connection.id]
        if (!move) return connection
        if (move.ends === "both") {
            return {
                ...connection,
                from: moveEndPoint(connection.from, move),
                to: moveEndPoint(connection.to, move),
                controlPoints: connection.controlPoints.map((cp) => moveEndPoint(cp, move)),
            } as Connection
        }
        return rerouteConnection(connection, board)
    })

    const updatedItems = Object.entries(itemMoves).reduce(
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
        connections,
    }
}

type Move = { xDiff: number; yDiff: number }
type ItemMove = Move & { containerChanged: boolean; containerId: Id | undefined }
type ConnectionMove = (Move & { ends: "both" }) | { ends: "one" }

function findConnectionMove(
    connection: Connection,
    moves: Record<Id, Move>,
    items: Record<string, Item>,
): ConnectionMove | null {
    const endPoints = [connection.to, connection.from]
    let move: Move | null = null
    let partial = false
    let hasItemEndPoints = false
    for (let endPoint of endPoints) {
        if (isItemEndPoint(endPoint)) {
            hasItemEndPoints = true
            const itemId = getEndPointItemId(endPoint)
            if (moves[itemId]) {
                move = moves[itemId]
            } else {
                // linked to item not being moved -> maybe a partial move
                partial = true
            }
        }
    }
    if (!move && !hasItemEndPoints && connection.containerId) {
        move = moves[connection.containerId]
    }
    if (!move) return null
    if (partial) return { ends: "one" }
    return { ends: "both", ...move }
}

function moveEndPoint(endPoint: ConnectionEndPoint, move: Move) {
    if (isItemEndPoint(endPoint)) {
        return endPoint // points to an item
    }
    const x = endPoint.x + move.xDiff
    const y = endPoint.y + move.yDiff
    return { ...endPoint, x, y }
}

function containedBy(a: Point, b: Rect) {
    return a.x > b.x && a.y > b.y && a.x < b.x + b.width && a.y < b.y + b.height
}
