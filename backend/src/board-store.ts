import { update } from "lodash"
import { Board, BoardItemEvent, migrateBoard, exampleBoard, Id } from "../../common/src/domain"
import { boardReducer } from "../../common/src/state"
import { withDBClient } from "./db"

let updateQueue: Set<Id> = new Set()

let boards: Map<Id, Board> = new Map()

export async function getBoard(id: Id): Promise<Board> {
    let board = boards.get(id)
    if (!board) {
        const result = await withDBClient(client => client.query("SELECT content FROM board WHERE id=$1", [id]))
        if (result.rows.length == 0) {
            if (id === exampleBoard.id) {
                board = exampleBoard
            } else {
                throw Error(`Board ${id} not found`)
            }
        } else {
            board = migrateBoard(result.rows[0].content as Board)
        }
        boards.set(board.id, board)
    }
    return board
}

export async function updateBoards(appEvent: BoardItemEvent) {
    const board = await getBoard(appEvent.boardId)
    const updated = boardReducer(board, appEvent)[0]    
    markForSave(updated)
}

export async function addBoard(board: Board) {
    const result = await withDBClient(client => client.query("SELECT id FROM board WHERE id=$1", [board.id]))
    if (result.rows.length > 0) throw Error("Board already exists: " + board.id)
    markForSave(board)
}

export function getActiveBoards() {
    return boards
}

export function cleanActiveBoards() {
    boards.clear()
}

function markForSave(board: Board) {
    boards.set(board.id, board)
    updateQueue.add(board.id)
}

setInterval(saveBoards, 1000)

async function saveBoards() {
    while (updateQueue.size > 0) {
        const id = updateQueue.values().next().value
        updateQueue.delete(id)
        await saveBoard(boards.get(id)!)
    }
}

async function saveBoard(board: Board) {
    try {        
        await withDBClient(async client => {
            client.query(
                `INSERT INTO board(id, name, content) VALUES ($1, $2, $3)
                 ON CONFLICT (id) DO UPDATE SET name=excluded.name, content=excluded.content WHERE board.id=excluded.id`,
                [board.id, board.name, board]
            )
        })
    } catch (e) {
        console.error("Board save failed for board", board.id, e)
    }
}