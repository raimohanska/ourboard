import {
    Board,
    BoardAttributes,
    BoardHistoryEntry,
    BoardWithHistory,
    CompactBoardHistory,
    Container,
    createBoard,
    defaultBoardSize,
    EventUserInfo,
    Item,
    Serial,
} from "./domain"
import { boardReducer } from "./board-reducer"

export function migrateBoardWithHistory(
    boardToMigrate: Board,
    historyToMigrate: BoardHistoryEntry[],
): CompactBoardHistory {
    const board = migrateBoard(boardToMigrate)
    const history = migrateHistory(historyToMigrate)
    const { items, ...boardAttributes } = board
    if (history.length > 0) {
        try {
            const emptyBoard = { ...boardAttributes, items: [] as Item[] } as Board
            history.reduce((b, e) => boardReducer(b, e)[0], emptyBoard) // To verify consistency of history
            return { boardAttributes, history }
        } catch (e) {
            console.warn("Board history check fail, bootstrapping", e)
        }
    }
    const bootstrappedHistory = [
        {
            action: "item.bootstrap",
            boardId: board.id,
            items: board.items,
            timestamp: new Date().toISOString(),
            user: { nickname: "admin" },
        },
    ] as BoardHistoryEntry[]
    return { boardAttributes, history: bootstrappedHistory }
}

function migrateHistory(historyToMigrate: BoardHistoryEntry[]) {
    return historyToMigrate.map((entry) => {
        const user = {
            ...entry.user,
            userType: entry.user.userType || (entry.user.nickname === "admin" ? "system" : "unidentified"),
        } as EventUserInfo
        return { ...entry, user }
    })
}

export function buildBoardFromHistory(boardAttributes: BoardAttributes, history: BoardHistoryEntry[]): Board {
    const emptyBoard = { ...boardAttributes, items: [] as Item[] } as Board
    const resultBoard = history.reduce((b, e) => boardReducer(b, e)[0], emptyBoard)
    return resultBoard
}

export function toCompactBoardHistory(board: BoardWithHistory, initAtSerial?: Serial) {
    const { items, ...boardAttributes } = board.board
    const history = initAtSerial ? board.history.filter((e) => (e.serial || 0) > initAtSerial) : board.history
    return { boardAttributes, history }
}

export function migrateBoard(board: Board) {
    const items: Item[] = []
    const width = Math.max(board.width || 0, defaultBoardSize.width)
    const height = Math.max(board.height || 0, defaultBoardSize.height)
    for (const item of board.items) {
        if (items.find((i) => i.id === item.id)) {
            console.warn("Duplicate item", item, "found on table", board.name)
        } else {
            items.push(migrateItem(item, items, board.items))
        }
    }
    return { ...board, width, height, items }

    function migrateItem(item: Item, migratedItems: Item[], boardItems: Item[]): Item {
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
                    const containedItem =
                        migratedItems.find((mi) => mi.id === i) || boardItems.find((bi) => bi.id === i)
                    containedItem && (containedItem.containerId = container.id)
                })
            }
        }

        return fixedItem
    }
}
