import { Board, BoardHistoryEntry, BoardWithHistory, Container, createBoard, defaultBoardSize, Item } from "./domain"
import { boardReducer } from "./state"

export function migrateBoardWithHistory(boardWithHistory: BoardWithHistory) {
    const board = migrateBoard(boardWithHistory.board)
    return {
        board,
        history: migrateHistory(board, boardWithHistory.history)
    }
}
function migrateHistory(board: Board, history: BoardHistoryEntry[]): BoardHistoryEntry[] {
    if (history.length > 0) {
        try {
            history.reduce((b, e) => boardReducer(b, e)[0], createBoard("tmp"))
            return history
        } catch (e) {
            console.warn("Board history check fail, bootstrapping", e)
        }
    }
    return [{ "action": "item.bootstrap", boardId: board.id, items: board.items, timestamp: new Date().toISOString(), user: { nickname: "admin" } }]
}
export function migrateBoard(board: Board) {
    const items: Item[] = []
    const width = Math.max(board.width || 0, defaultBoardSize.width)
    const height = Math.max(board.height || 0, defaultBoardSize.height)
    for (const item of board.items) {
        if (items.find(i => i.id === item.id)) {
            console.warn("Duplicate item", item, "found on table", board.name)
        } else {
            items.push(migrateItem(item, items, board.items))
        }
    }
    return { ...board, width, height, items }
    
    function migrateItem(item: Item, migratedItems: Item[], boardItems: Item[]): Item {
        const { width, height, z, type, ...rest } = item

        // Force type, width and height for all items
        let fixedItem = { type: type || "note", width: width || 5, height: height || 5, z: z || 0, ...rest } as Item
        if (fixedItem.type === "container") {
            let container = fixedItem as Container & { items?: string[]}
            // Force container to have text
            container.text = container.text || ""
            // If container had items property, migrate each corresponding item to have containerId of that container instead
            if (container.items) {
                const ids = container.items
                delete container.items
                ids.forEach(i => {
                    const containedItem = migratedItems.find(mi => mi.id === i) || boardItems.find(bi => bi.id === i)
                    containedItem && (containedItem.containerId = container.id)
                })
            }
        }

        return fixedItem
    }
}