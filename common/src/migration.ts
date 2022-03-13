import { isArray } from "lodash"
import { arrayToRecordById, toArray } from "./arrays"
import { resolveEndpoint } from "./connection-utils"
import { Board, BoardHistoryEntry, Container, Connection, defaultBoardSize, Id, Item, Serial } from "./domain"

export function mkBootStrapEvent(boardId: Id, snapshot: Board, serial: Serial = 1) {
    return {
        action: "item.bootstrap",
        boardId,
        items: snapshot.items,
        connections: snapshot.connections,
        timestamp: new Date().toISOString(),
        user: { nickname: "admin", userType: "system" },
        serial,
    } as BoardHistoryEntry
}

export function migrateBoard(origBoard: Board) {
    const board = { ...origBoard }
    const items: Item[] = []
    const width = Math.max(board.width || 0, defaultBoardSize.width)
    const height = Math.max(board.height || 0, defaultBoardSize.height)
    for (const item of Object.values(board.items)) {
        if (items.find((i) => i.id === item.id)) {
            console.warn("Duplicate item", item, "found on table", board.name)
        } else {
            items.push(migrateItem(item, items, board.items))
        }
    }
    if (board.accessPolicy) {
        if (!board.accessPolicy.allowList.some((e) => e.access === "admin")) {
            console.log(`No board admin for board ${board.id} -> mapping all read-write users as admins`)
            board.accessPolicy.allowList = board.accessPolicy.allowList.map((e) => ({
                ...e,
                access: e.access === "read-write" ? "admin" : e.access,
            }))
        }
    }

    const connections = (board.connections ?? [])
        .filter((c) => {
            try {
                resolveEndpoint(c.from, board)
                resolveEndpoint(c.to, board)
            } catch (e) {
                console.error(`Error resolving connection ${JSON.stringify(c)}`)
                return false
            }
            return true
        })
        .map(migrateConnection)

    return { ...board, connections, width, height, items: arrayToRecordById(items) }
}

function migrateConnection(c: Connection): Connection {
    if (c.fromStyle && c.fromStyle !== ("white-dot" as any) && c.toStyle && c.pointStyle) return c
    return { ...c, fromStyle: "black-dot", toStyle: "arrow", pointStyle: "black-dot" }
}

function migrateItem(item: Item, migratedItems: Item[], boardItems: Record<string, Item>): Item {
    const { width, height, z, type, ...rest } = item

    // Force type, width and height for all items
    let fixedItem = { type: type || "note", width: width || 5, height: height || 5, z: z || 0, ...rest } as Item
    if (fixedItem.type === "container") {
        let container = fixedItem as Container & { items?: string[] }
        // Force container to have text
        container.text = container.text || ""
        // If container had items property, migrate each corresponding item to have containerId of that container instead
        if (container.items) {
            const ids = container.items
            delete container.items
            ids.forEach((i) => {
                const containedItem = migratedItems.find((mi) => mi.id === i) || boardItems[i]
                containedItem && (containedItem.containerId = container.id)
            })
        }
    }

    return fixedItem
}

export function migrateEvent(event: BoardHistoryEntry): BoardHistoryEntry {
    if (event.action === "connection.add") {
        if (!isArray(event.connections)) {
            return { ...event, connections: toArray((event as any).connection) }
        }
    } else if (event.action === "connection.modify") {
        if (!isArray(event.connections)) {
            return { ...event, connections: toArray((event as any).connection) }
        }
    } else if (event.action === "connection.delete") {
        if (!isArray(event.connectionIds)) {
            return { ...event, connectionIds: toArray((event as any).connectionId) }
        }
    } else if (event.action === "item.move") {
        if (!event.connections) {
            return { ...event, connections: [] }
        }
    } else if (event.action === "item.delete") {
        if (!event.connectionIds) {
            return { ...event, connectionIds: [] }
        }
    } else if (event.action === "item.add") {
        if (!event.connections) {
            return { ...event, connections: [] }
        }
    }
    return event
}
