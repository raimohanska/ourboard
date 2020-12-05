import { update } from "lodash"
import { Board, BoardItemEvent, migrateBoard, exampleBoard, Id, AppEvent } from "../../common/src/domain"
import { boardReducer } from "../../common/src/state"
import { withDBClient } from "./db"
import { canFoldActions } from "../../common/src/action-folding"

let updateQueue: Set<Id> = new Set()

let boards: Map<Id, BoardWithHistory> = new Map()

type BoardHistoryEvent = { user: { nickname: string }, event: AppEvent }
type BoardWithHistory = { board: Board, history: BoardHistoryEvent[] }

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
            board = { board: migrateBoard(result.rows[0].content as Board), history: result.rows[0].history.history || [] }
        }
        boards.set(board.board.id, board)
    }
    return board
}

export async function updateBoards(appEvent: BoardItemEvent, user: { nickname: string }) {
    const board = await getBoard(appEvent.boardId)
    const updatedBoard = boardReducer(board.board, appEvent)[0]
    const history = updatedBoard !== board.board ? addToHistory(board.history, { event: appEvent, user }) : board.history
    const updated = { board: updatedBoard, history }
    markForSave(updated)
}

function addToHistory(history: BoardHistoryEvent[], newEvent: BoardHistoryEvent) {
    if (history.length === 0) return [newEvent]
    const latest = history[history.length - 1]
    if (canFoldActions(latest.event, newEvent.event)) {
        return [...history.slice(0, history.length - 1), newEvent]
    }
    return [...history, newEvent]
}

export async function addBoard(board: Board) {
    const result = await withDBClient(client => client.query("SELECT id FROM board WHERE id=$1", [board.id]))
    if (result.rows.length > 0) throw Error("Board already exists: " + board.id)
    markForSave({ board, history: [] })
}

export function getActiveBoards() {
    return boards
}

export function cleanActiveBoards() {
    boards.clear()
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
    console.log(history)
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