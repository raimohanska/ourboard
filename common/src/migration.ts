import { Board, BoardHistoryEntry, Container, defaultBoardSize, Id, Item, Serial } from "./domain"

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

export function arrayToObject<T, K extends keyof T>(key: K, arr: T[]) {
    return arr.reduce((acc: Record<string, T>, elem: T) => {
        const k = String(elem[key])
        acc[k] = elem
        return acc
    }, {} as Record<string, T>)
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
    return { ...board, connections: board.connections ?? [], width, height, items: arrayToObject("id", items) }

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
}
