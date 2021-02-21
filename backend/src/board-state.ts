import { boardReducer } from "../../common/src/board-reducer"
import { Board, BoardCursorPositions, BoardHistoryEntry, Id, ItemLocks, Serial } from "../../common/src/domain"
import { Locks } from "./locker"
import { createBoard, fetchBoard, saveRecentEvents } from "./board-store"
import { broadcastItemLocks, getBoardSessionCount } from "./sessions"

// A mutable state object for server side state
export type ServerSideBoardState = {
    board: Board
    recentEvents: BoardHistoryEntry[]
    storingEvents: BoardHistoryEntry[]
    locks: ReturnType<typeof Locks>
    cursorsMoved: boolean
    cursorPositions: BoardCursorPositions
}

let boards: Map<Id, ServerSideBoardState> = new Map()

export async function getBoard(id: Id): Promise<ServerSideBoardState> {
    let state = boards.get(id)
    if (!state) {
        console.log(`Loading board ${id} into memory`)
        const board = await fetchBoard(id)
        state = {
            board,
            recentEvents: [],
            storingEvents: [],
            locks: Locks((changedLocks) => broadcastItemLocks(id, changedLocks)),
            cursorsMoved: false,
            cursorPositions: {},
        }
        boards.set(board.id, state)
    }
    return state
}

export function maybeGetBoard(id: Id): ServerSideBoardState | undefined {
    return boards.get(id)
}

export async function updateBoards(appEvent: BoardHistoryEntry) {
    const boardState = await getBoard(appEvent.boardId)
    const currentSerial = boardState.board.serial
    const serial = currentSerial + 1
    if (appEvent.serial !== undefined) {
        throw Error("Event already has serial")
    }
    const eventWithSerial = { ...appEvent, serial }
    const updatedBoard = boardReducer(boardState.board, eventWithSerial)[0]

    boardState.board = updatedBoard
    boardState.recentEvents.push(eventWithSerial)
    return serial
}

export async function addBoard(board: Board): Promise<ServerSideBoardState> {
    await createBoard(board)
    const boardState = {
        board,
        serial: 0,
        recentEvents: [],
        storingEvents: [],
        locks: Locks((changedLocks) => broadcastItemLocks(board.id, changedLocks)),
        cursorsMoved: false,
        cursorPositions: {},
    }
    boards.set(board.id, boardState)
    return boardState
}

export function getActiveBoards() {
    return boards
}

async function saveBoards() {
    for (let state of boards.values()) {
        await saveBoardChanges(state)
    }
    setTimeout(saveBoards, 1000)
}

async function saveBoardChanges(state: ServerSideBoardState) {
    if (state.recentEvents.length > 0) {
        if (state.storingEvents.length > 0) {
            throw Error("Invariant failed: storingEvents not empty")
        }
        state.storingEvents = state.recentEvents.splice(0)
        try {
            await saveRecentEvents(state.board.id, state.storingEvents)            
        } catch (e) {
            // Push event back to the head of save list for retrying later
            state.recentEvents = [...state.storingEvents, ...state.recentEvents]
            console.error("Board save failed for board", state.board.id, e)
        }
        state.storingEvents = []
    }
    if (getBoardSessionCount(state.board.id) == 0) {
        console.log(`Purging board ${state.board.id} from memory`)
        boards.delete(state.board.id)
    }
}

setInterval(() => {
    console.log("Number of active boards: " + boards.size)
}, 60000)

saveBoards()
