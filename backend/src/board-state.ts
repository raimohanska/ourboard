import { boardReducer } from "../../common/src/board-reducer"
import { Board, BoardCursorPositions, BoardHistoryEntry, Id, ItemLocks, Serial } from "../../common/src/domain"
import { Locks } from "./locker"
import { createAccessToken, createBoard, fetchBoard, saveRecentEvents } from "./board-store"
import { broadcastItemLocks, getBoardSessionCount, getSessionCount } from "./sessions"
import { compactBoardHistory, quickCompactBoardHistory } from "./compact-history"
import { sleep } from "../../common/src/sleep"
import { UserSession } from "./sessions"
// A mutable state object for server side state
export type ServerSideBoardState = {
    ready: true
    board: Board
    recentEvents: BoardHistoryEntry[]
    storingEvents: BoardHistoryEntry[]
    locks: ReturnType<typeof Locks>
    cursorsMoved: boolean
    cursorPositions: BoardCursorPositions
    accessTokens: string[]
    sessions: UserSession[]
}

export type ServerSideBoardStateInternal =
    | ServerSideBoardState
    | {
          ready: false
          fetch: Promise<ServerSideBoardState | null>
      }

let boards: Map<Id, ServerSideBoardStateInternal> = new Map()

export async function getBoard(id: Id): Promise<ServerSideBoardState | null> {
    let state = boards.get(id)
    if (!state) {
        console.log(`Loading board ${id} into memory`)
        const fetchState = async () => {
            const boardData = await fetchBoard(id)
            if (!boardData) return null
            const { board, accessTokens } = boardData
            return {
                ready: true,
                board,
                accessTokens,
                recentEvents: [],
                storingEvents: [],
                locks: Locks((changedLocks) => broadcastItemLocks(id, changedLocks)),
                cursorsMoved: false,
                cursorPositions: {},
                sessions: [],
            } as ServerSideBoardState
        }
        const fetch = fetchState()
        const temporaryState = {
            ready: false as const,
            fetch,
        }
        boards.set(id, temporaryState)
        try {
            const finalState = await fetch
            if (!finalState) {
                boards.delete(id)
                return null
            } else {
                boards.set(id, finalState)
                console.log(`Board loaded into memory: ${id}`)
                return finalState
            }
        } catch (e) {
            boards.delete(id)
            console.error(`Board load failed for board ${id}. Running compact/fix.`)
            await compactBoardHistory(id)
            throw e
        }
    } else if (!state.ready) {
        return await state.fetch
    } else {
        return state
    }
}

export function maybeGetBoard(id: Id): ServerSideBoardState | undefined {
    const state = boards.get(id)
    if (state?.ready) return state
}

export function updateBoards(boardState: ServerSideBoardState, appEvent: BoardHistoryEntry) {
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

export async function addBoard(board: Board, createToken?: boolean): Promise<ServerSideBoardState> {
    await createBoard(board)
    const accessTokens = createToken ? [await createAccessToken(board)] : []
    const boardState = {
        ready: true as const,
        board,
        serial: 0,
        recentEvents: [],
        storingEvents: [],
        locks: Locks((changedLocks) => broadcastItemLocks(board.id, changedLocks)),
        cursorsMoved: false,
        cursorPositions: {},
        accessTokens,
        sessions: [],
    }
    boards.set(board.id, boardState)
    return boardState
}

export function getActiveBoards() {
    return [...boards.values()].filter((b) => b.ready) as ServerSideBoardState[]
}

let savingPromise: Promise<void> = saveBoards()

async function saveBoards() {
    await sleep(1000)
    for (let state of boards.values()) {
        if (state.ready) await saveBoardChanges(state)
    }
    savingPromise = saveBoards()
}

export async function awaitSavingChanges() {
    await savingPromise
}

async function saveBoardChanges(state: ServerSideBoardState) {
    if (state.recentEvents.length > 0) {
        if (state.storingEvents.length > 0) {
            throw Error("Invariant failed: storingEvents not empty")
        }
        state.storingEvents = state.recentEvents.splice(0)
        console.log(
            `Saving board ${state.board.id} at serial ${state.board.serial} with ${state.storingEvents.length} new events`,
        )
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
        await quickCompactBoardHistory(state.board.id)
    }
}

export function getActiveBoardCount() {
    return boards.size
}

setInterval(() => {
    console.log("Statistics: active boards " + getActiveBoardCount() + ", sessions " + getSessionCount())
}, 60000)
