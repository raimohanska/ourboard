import { boardHistoryReducer } from "../../common/src/board-history-reducer"
import { boardReducer } from "../../common/src/board-reducer"
import { Board, BoardAttributes, BoardHistoryEntry, BoardWithHistory, exampleBoard, Id, Item } from "../../common/src/domain"
import { migrateBoardWithHistory } from "../../common/src/migration"
import { withDBClient } from "./db"

let updateQueue: Set<Id> = new Set()

let boards: Map<Id, BoardWithHistory> = new Map()

export async function getBoard(id: Id): Promise<BoardWithHistory> {
    let board = boards.get(id)
    if (!board) {
        const result = await withDBClient(client => client.query("SELECT content, history FROM board WHERE id=$1", [id]))
        if (result.rows.length == 0) {
            if (id === exampleBoard.id) {
                board = { board: exampleBoard, history: [] }
            } else {
                throw Error(`Board ${id} not found`)
            }
        } else {
            const { boardAttributes, history } = migrateBoardWithHistory(result.rows[0].content as Board, result.rows[0].history.history || [])
            const boardWithHistory = { board: buildBoardFromHistory(boardAttributes, history), history }
            boards.set(boardWithHistory.board.id, boardWithHistory)
            return boardWithHistory
        }
    }
    return board
}

function buildBoardFromHistory(boardAttributes: BoardAttributes, history: BoardHistoryEntry[]): Board {
    const emptyBoard = { ...boardAttributes, items: [] as Item[] } as Board
    const resultBoard = history.reduce((b, e) => boardReducer(b, e)[0], emptyBoard)
    return resultBoard
}

export async function updateBoards(appEvent: BoardHistoryEntry) {
    const boardWithHistory = await getBoard(appEvent.boardId)
    const currentSerial = boardWithHistory.history[boardWithHistory.history.length - 1]?.serial ?? 0
    const serial = currentSerial + 1
    if (appEvent.serial !== undefined) {
        throw Error("Event already has serial")
    }
    const eventWithSerial = { ...appEvent, serial }
    const updatedBoardWithHistory = boardHistoryReducer(boardWithHistory, eventWithSerial)[0]    
    markForSave(updatedBoardWithHistory)
    return serial
}

export async function addBoard(board: Board): Promise<BoardWithHistory> {
    const result = await withDBClient(client => client.query("SELECT id FROM board WHERE id=$1", [board.id]))
    if (result.rows.length > 0) throw Error("Board already exists: " + board.id)
    const boardWithHistory = { board, history: [] }
    markForSave(boardWithHistory)
    return boardWithHistory
}

export function getActiveBoards() {
    return boards
}

function markForSave(board: BoardWithHistory) {
    boards.set(board.board.id, board)
    updateQueue.add(board.board.id)
}

setInterval(saveBoards, 1000)

async function saveBoards() {
    while (updateQueue.size > 0) {
        const id = updateQueue.values().next().value
        updateQueue.delete(id)
        await saveBoard(boards.get(id)!)
    }
}

async function saveBoard(boardWithHistory: BoardWithHistory) {
    const { board, history } = boardWithHistory
    try {        
        await withDBClient(async client => {
            client.query(
                `INSERT INTO board(id, name, content, history) VALUES ($1, $2, $3, $4)
                 ON CONFLICT (id) DO UPDATE SET name=excluded.name, content=excluded.content, history=excluded.history WHERE board.id=excluded.id`,
                [board.id, board.name, board, { history }]
            )
        })
    } catch (e) {
        console.error("Board save failed for board", board.id, e)
    }
}
