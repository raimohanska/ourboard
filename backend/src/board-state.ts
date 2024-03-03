import { merge } from "lodash"
import { boardReducer } from "../../common/src/board-reducer"
import { Board, BoardCursorPositions, BoardHistoryEntry, Id } from "../../common/src/domain"
import { sleep } from "../../common/src/sleep"
import { createAccessToken, createBoard, fetchBoard, storeEventHistoryBundle } from "./board-store"
import { quickCompactBoardHistory } from "./compact-history"
import { Locks } from "./locker"
import { UserSession, broadcastItemLocks, getBoardSessionCount, getSessionCount } from "./websocket-sessions"
import * as Y from "yjs"
import { inTransaction } from "./db"

// A mutable state object for server side state
export type ServerSideBoardState = {
    ready: true
    board: Board
    recentEvents: BoardHistoryEntry[]
    recentCrdtUpdate: Uint8Array | null
    currentlyStoring: {
        events: BoardHistoryEntry[]
        crdtUpdate: Uint8Array | null
    } | null
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
                recentCrdtUpdate: null,
                currentlyStoring: null,
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
            // TODO: avoid retry loop
            console.error(`Board load failed for board ${id}`)
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

    const updatedBoard = boardReducer(boardState.board, eventWithSerial, { inplace: true, strictOnSerials: true })[0]

    boardState.board = updatedBoard
    boardState.recentEvents.push(eventWithSerial)
    return serial
}

export function updateBoardCrdt(id: Id, crdtUpdate: Uint8Array) {
    const boardState = maybeGetBoard(id)

    if (!boardState) {
        console.warn("CRDT update for board not loaded into memory", id)
    } else {
        boardState.recentCrdtUpdate = combineCrdtUpdates(boardState.recentCrdtUpdate, crdtUpdate)
    }
}

export async function addBoard(board: Board, createToken?: boolean): Promise<ServerSideBoardState> {
    await createBoard(board)
    const accessTokens = createToken ? [await createAccessToken(board)] : []
    const boardState = {
        ready: true as const,
        board,
        serial: 0,
        recentEvents: [],
        recentCrdtUpdate: null,
        currentlyStoring: null,
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
    if (state.recentEvents.length > 0 || state.recentCrdtUpdate !== null) {
        if (state.currentlyStoring) {
            throw Error("Invariant failed: storingEvents not empty")
        }
        const events = state.recentEvents.splice(0)
        const crdtUpdate = state.recentCrdtUpdate
        state.currentlyStoring = {
            events,
            crdtUpdate,
        }
        state.recentCrdtUpdate = null
        console.log(
            `Saving board ${state.board.id} at serial ${state.board.serial} with ${
                state.currentlyStoring.events.length
            } new events ${crdtUpdate ? "and CRDT update of size " + crdtUpdate.length : ""}`,
        )
        const lastSerial = state.board.serial
        try {
            await inTransaction((client) =>
                storeEventHistoryBundle(state.board.id, events, lastSerial, crdtUpdate, client),
            )
        } catch (e) {
            // Push event back to the head of save list for retrying later
            state.recentEvents = [...state.currentlyStoring.events, ...state.recentEvents]
            state.recentCrdtUpdate = merge(state.currentlyStoring.crdtUpdate, state.recentCrdtUpdate)
            console.error("Board save failed for board", state.board.id, e)
        }
        state.currentlyStoring = null
    }
    if (state.recentEvents.length === 0 && getBoardSessionCount(state.board.id) === 0) {
        console.log(`Purging board ${state.board.id} from memory`)
        boards.delete(state.board.id)
        await quickCompactBoardHistory(state.board.id)
    }
}

export function combineCrdtUpdates(a: Uint8Array | null, b: Uint8Array | null) {
    if (!a) return b
    if (!b) return a
    return Y.mergeUpdates([a, b])
}

export function getActiveBoardCount() {
    return boards.size
}

setInterval(() => {
    console.log("Statistics: active boards " + getActiveBoardCount() + ", sessions " + getSessionCount())
}, 60000)
