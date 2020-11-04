import { AppEvent, Board, BoardItemEvent, defaultBoardSize, exampleBoard, Id, Item } from "../../common/domain"
import { boardReducer } from "../../common/state"
import { withDBClient } from "./db"
import * as L from "lonna"
import { update } from "lodash"

let updateQueue: Board[] = []

let boards: Board[] = []

export async function getBoard(id: Id): Promise<Board> {
    let board = boards.find(b => b.id === id)
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
        boards.push(board)
    }
    return board
}

function migrateBoard(board: Board) {
    const items: Item[] = []
    for (const item of board.items) {
        if (items.find(i => i.id === item.id)) {
            console.warn("Duplicate item", item, "found on table", board.name)
        } else {
            items.push(migrateItem(item))
        }
    }
    return { ...defaultBoardSize, ...board, items }
    
    function migrateItem(item: Item): Item {
        const { width, height, type, ...rest } = item

        let fixedItem = { type: type || "note", width: width || 5, height: height || 5, ...rest } as Item
        if (fixedItem.type === "container") {
            fixedItem.text = fixedItem.text || ""
        }

        return fixedItem
    }
}

export async function updateBoards(appEvent: BoardItemEvent) {
    const board = await getBoard(appEvent.boardId)
    boards = boards.map(board => board.id === appEvent.boardId 
        ? markForSave(boardReducer(board, appEvent)[0])
        : board)
}

export async function addBoard(board: Board) {
    const result = await withDBClient(client => client.query("SELECT id FROM board WHERE id=$1", [board.id]))
    if (result.rows.length > 0) throw Error("Board already exists: " + board.id)
    boards.push(board)
    markForSave(board)
}

export function getActiveBoards() {
    return boards
}

export function cleanActiveBoards() {
    boards = []
}

function markForSave(board: Board): Board {
    updateQueue = updateQueue.filter(b => b.id !== board.id).concat(board)
    return board
}

setInterval(saveBoards, 1000)

async function saveBoards() {
    while (updateQueue.length > 0) {
        const board = updateQueue.shift()!
        await saveBoard(board)
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