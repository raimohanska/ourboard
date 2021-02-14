import { PoolClient } from "pg"
import { boardHistoryReducer } from "../../common/src/board-history-reducer"
import { boardReducer } from "../../common/src/board-reducer"
import {
    Board,
    BoardAttributes,
    BoardHistoryEntry,
    exampleBoard,
    Id,
    Item,
    Serial,
} from "../../common/src/domain"
import { migrateBoardWithHistory } from "../../common/src/migration"
import { inTransaction, withDBClient } from "./db"

export type ServerSideBoardState = {
    board: Board,
    serial: Serial,
    recentEvents: BoardHistoryEntry[]
}

let updateQueue: Set<Id> = new Set()
let boards: Map<Id, ServerSideBoardState> = new Map()

export async function getBoard(id: Id): Promise<ServerSideBoardState> {
    let board = boards.get(id)
    if (board) return board
    console.log(`Loading board ${id} into memory`)
    return await inTransaction(async client => {
        const result = await client.query("SELECT content, history FROM board WHERE id=$1", [id]);
        if (result.rows.length == 0) {
            if (id === exampleBoard.id) {
                // Example board is a special case: it is automatically created if not in DB yet.
                return { board: exampleBoard, recentEvents: [], serial: 0 }
            } else {
                throw Error(`Board ${id} not found`)
            }
        } else {
            const snapshot = result.rows[0].content as BoardSnapshot
            const legacyHistory = result.rows[0].history.history || []
            if (legacyHistory.length) {
                await migrateLegacyHistory(id, legacyHistory, client)
            }
            let history: BoardHistoryEntry[]
            let initialBoard: Board;
            if (snapshot.serial) {
                history = await getBoardHistory(id, snapshot.serial)
                console.log(`Fetching partial history for board ${id}, starting at serial ${snapshot.serial}, consisting of ${history.length} events`)
                initialBoard = snapshot                            
            } else { 
                history = await getFullBoardHistory(id, client)
                console.log(`Fetched full history for board ${id}, consisting of ${history.length} events`)
                initialBoard = { ...snapshot, items: [] }                
            }
            const board = history.reduce((b, e) => boardReducer(b, e)[0], initialBoard)
            const serial = (history.length > 0 ? history[history.length - 1].serial : snapshot.serial) || 0
            if (history.length > 1000) {                
                await saveBoardSnapshot(mkSnapshot(board, serial), client)
            }
            const boardState = { board, recentEvents: [], serial }
            boards.set(boardState.board.id, boardState)
            return boardState
        }
    })        
}

export function deactivateBoard(id: Id) {
    console.log(`Purging board ${id} from memory`)
    boards.delete(id)
    updateQueue.delete(id)
}

async function migrateLegacyHistory(id: Id, history: BoardHistoryEntry[], client: PoolClient) {
    if (history.length > 0) {
        console.log(`Migrating event history for board ${id}, consisting of ${history.length} events`);
        await storeEventHistoryBundle(id, history, client)
        await client.query(
            `UPDATE board SET history='{}' WHERE board.id=$1`,
            [id],
        )
    
        console.log(`Migrated event history of board ${id} with serials ${history[0].serial}..${history[history.length-1].serial}`)
    }
}

export async function getFullBoardHistory(id: Id, client: PoolClient): Promise<BoardHistoryEntry[]> {
    return (await client.query(
        `SELECT events FROM board_event WHERE board_id=$1 ORDER BY last_serial`,
        [id]
    )).rows
        .flatMap(row => row.events.events as BoardHistoryEntry[])
}


export async function getBoardHistory(id: Id, afterSerial: Serial): Promise<BoardHistoryEntry[]> {
    return withDBClient(async client => {
        // TODO: still fails when there are no more recent events. This should be recognized, maybe by a serial field in board table?


        const historyEvents = (await client.query(
            `SELECT events FROM board_event WHERE board_id=$1 AND last_serial > $2 ORDER BY last_serial`,
            [id, afterSerial]
        )).rows
            .flatMap(row => row.events.events as BoardHistoryEntry[])
            .filter(e => e.serial! > afterSerial)

        console.log(`Fetched board history for board ${id} after serial ${afterSerial} -> ${historyEvents.length} events`)
        if (historyEvents.length === 0) {
            return historyEvents
        }
        if (historyEvents[0].serial === afterSerial + 1) {
            return historyEvents
        }
        
        throw Error(`Cannot find history to start after the requested serial ${afterSerial} for board ${id}. Found history for ${historyEvents[0].serial}..${historyEvents[historyEvents.length - 1].serial}`)
    })
}

function buildBoardFromHistory(boardAttributes: BoardAttributes, history: BoardHistoryEntry[]): Board {
    const emptyBoard = { ...boardAttributes, items: [] as Item[] } as Board
    const resultBoard = history.reduce((b, e) => boardReducer(b, e)[0], emptyBoard)
    return resultBoard
}

export async function updateBoards(appEvent: BoardHistoryEntry) {
    const boardState = await getBoard(appEvent.boardId)
    const currentSerial = boardState.serial
    const serial = currentSerial + 1
    if (appEvent.serial !== undefined) {
        throw Error("Event already has serial")
    }
    const eventWithSerial = { ...appEvent, serial }
    const updatedBoard = boardReducer(boardState.board, eventWithSerial)[0]
    const updatedBoardState = { board: updatedBoard, recentEvents: boardState.recentEvents.concat([eventWithSerial]), serial }
    markForSave(updatedBoardState)
    return serial
}

export async function addBoard(board: Board): Promise<ServerSideBoardState> {
    const result = await withDBClient((client) => client.query("SELECT id FROM board WHERE id=$1", [board.id]))
    if (result.rows.length > 0) throw Error("Board already exists: " + board.id)
    const boardState = { board, serial: 0, recentEvents: [] }
    markForSave(boardState)
    return boardState
}

export function getActiveBoards() {
    return boards
}

function markForSave(board: ServerSideBoardState) {
    const id = board.board.id
    boards.set(id, board)
    updateQueue.add(id)
}

setInterval(saveBoards, 1000)

async function saveBoards() {
    while (updateQueue.size > 0) {
        const id = updateQueue.values().next().value
        updateQueue.delete(id)
        await saveBoard(boards.get(id)!)
    }
}

type BoardSnapshot = Board & { serial: Serial }

async function saveBoard(boardState: ServerSideBoardState) {
    const { serial, board, recentEvents } = boardState
    try {
        await inTransaction(async (client) => {
            console.log(`Save board ${board.id} at serial ${serial}`)
            if (serial === 0) {
                client.query(
                    `INSERT INTO board(id, name, content) VALUES ($1, $2, $3)`,
                    [board.id, board.name, mkSnapshot(board, serial)],
                )
            } else {
                await storeEventHistoryBundle(board.id, recentEvents, client)
            }
        })
        boards.set( board.id, { ...boardState, recentEvents: [] } )
    } catch (e) {
        console.error("Board save failed for board", board.id, e)
    }
}

function mkSnapshot(board: Board, serial: Serial) {
    return { ...board, serial }
}

async function saveBoardSnapshot(board: BoardSnapshot, client: PoolClient) {
    console.log(`Save board snapshot ${board.id} at serial ${board.serial}`)
    client.query(
        `UPDATE board set name=$2, content=$3 WHERE id=$1`,
        [board.id, board.name, board],
    )
}

async function storeEventHistoryBundle(boardId: Id, events: BoardHistoryEntry[], client: PoolClient) {
    if (events.length > 0) {
        const lastSerial = events[events.length - 1].serial || 0 // default to zero for legacy events. db constraint will prevent inserting two bundles with the same serial
        client.query(
            `INSERT INTO board_event(board_id, last_serial, events) VALUES ($1, $2, $3)`,
            [boardId, lastSerial, { events }]
        )
    }
}
