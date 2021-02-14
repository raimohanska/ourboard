import { boardReducer } from "../../common/src/board-reducer"
import {
    Board,
    BoardHistoryEntry,
    Id,
    Serial
} from "../../common/src/domain"
import { createBoard, fetchBoard, saveRecentEvents } from "./board-store"

// A mutable state object for server side state
export type ServerSideBoardState = {
    board: Board,
    serial: Serial,
    recentEvents: BoardHistoryEntry[]
}

let boards: Map<Id, ServerSideBoardState> = new Map()

export async function getBoard(id: Id): Promise<ServerSideBoardState> {
    let board = boards.get(id)
    if (!board) {
        console.log(`Loading board ${id} into memory`)
        board = await fetchBoard(id)
        boards.set(board.board.id, board)
    }
    return board    
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


    boardState.board = updatedBoard
    boardState.recentEvents.push(eventWithSerial)
    boardState.serial = serial
    return serial
}

export async function addBoard(board: Board): Promise<ServerSideBoardState> {
    await createBoard(board)
    const boardState = { board, serial: 0, recentEvents: [] }
    boards.set(board.id, boardState)
    return boardState
}

export function deactivateBoard(id: Id) {
    console.log(`Purging board ${id} from memory`)
    boards.delete(id)
}

export function getActiveBoards() {
    return boards
}

async function saveBoards() {
    for (let state of boards.values()) {
        if (state.recentEvents.length > 0) {
            const eventsToSave = state.recentEvents.splice(0)
            try {
                await saveRecentEvents(state.board.id, eventsToSave)
            } catch (e) {
                // Push event back to the head of save list for retrying later
                state.recentEvents = [...eventsToSave, ...state.recentEvents]
                console.error("Board save failed for board", state.board.id, e)
            }
        }
    }
    setTimeout(saveBoards, 1000)
}

saveBoards()