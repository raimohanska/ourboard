import { Board, BoardWithHistory, BoardHistoryEntry, BoardItemEvent, migrateBoard, exampleBoard, Id, AppEvent, EventUserInfo, migrateHistory } from "../../common/src/domain"
import { boardHistoryReducer, boardReducer } from "../../common/src/state"
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
            const b = migrateBoard(result.rows[0].content as Board)
            board = { 
                board: b, 
                history: migrateHistory(b, result.rows[0].history.history || []) 
            }
        }
        boards.set(board.board.id, board)
    }
    return board
}

export async function updateBoards(appEvent: BoardHistoryEntry) {
    const boardWithHistory = await getBoard(appEvent.boardId)
    const updatedBoardWithHistory = boardHistoryReducer(boardWithHistory, appEvent)[0]    
    markForSave(updatedBoardWithHistory)
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