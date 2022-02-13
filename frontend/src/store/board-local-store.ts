import * as localForage from "localforage"
import { throttle } from "lodash"
import { Board, BoardHistoryEntry, Id } from "../../../common/src/domain"
import { migrateBoard, migrateEvent } from "../../../common/src/migration"

export type LocalStorageBoard = {
    serverShadow: Board
    queue: BoardHistoryEntry[] // serverShadow + queue = current board
    serverHistory: BoardHistoryEntry[] // history until serverShadow (queued events not included)
}

const BOARD_STORAGE_KEY_PREFIX = "board_"

let activeBoardState: LocalStorageBoard | undefined = undefined

async function getInitialBoardState(boardId: Id) {
    if (!activeBoardState || activeBoardState.serverShadow.id != boardId) {
        const localStorageKey = getStorageKey(boardId)
        activeBoardState = await getStoredState(localStorageKey)
    }
    return activeBoardState
}

async function getStoredState(localStorageKey: string): Promise<LocalStorageBoard | undefined> {
    try {
        const stringState = await localForage.getItem<string>(localStorageKey)
        const state = JSON.parse(stringState!) as LocalStorageBoard
        if (!state || !state.serverShadow) {
            return undefined
        }
        return {
            serverShadow: migrateBoard(state.serverShadow),
            queue: state.queue.map(migrateEvent),
            serverHistory: state.serverHistory.map(migrateEvent),
        }
    } catch (e) {
        console.error(`Fetching local state ${localStorageKey} from IndexedDB failed`, e)
        await clearStateByKey(localStorageKey)
    }
}

function getStorageKey(boardId: string) {
    return BOARD_STORAGE_KEY_PREFIX + boardId
}

const maxLocalStoredHistory = 1000 // TODO: limit history to this, using snapshotting

async function storeBoardState(newState: LocalStorageBoard): Promise<void> {
    activeBoardState = newState
    storeThrottled(activeBoardState)
}

const storeThrottled = throttle(
    (newState: LocalStorageBoard) => {
        try {
            localForage.setItem(getStorageKey(newState.serverShadow.id), JSON.stringify(newState))
        } catch (err) {
            console.error(`Saving board state for ${newState.serverShadow.id} failed`, err)
        }
    },
    1000,
    { leading: true, trailing: true },
)

async function clearBoardState(boardId: Id) {
    return await clearStateByKey(getStorageKey(boardId))
}

async function clearStateByKey(localStorageKey: string) {
    try {
        await localForage.removeItem(localStorageKey)
    } catch (err) {
        console.error(`Clearing board state for ${localStorageKey} failed`, err)
    }
}

async function clearAllPrivateBoards(): Promise<void> {
    const keys = await localForage.keys()
    await Promise.all(
        keys.map(async (k) => {
            if (!k.startsWith(BOARD_STORAGE_KEY_PREFIX)) return
            const state = await getStoredState(k)
            if (state && state.serverShadow.accessPolicy) {
                console.log(`Clearing local state for private board ${k}`)
                await clearStateByKey(k)
            }
        }),
    )
}

export type BoardLocalStore = {
    getInitialBoardState: (boardId: Id) => Promise<LocalStorageBoard | undefined>
    clearBoardState: (boardId: Id) => Promise<void>
    clearAllPrivateBoards: () => Promise<void>
    storeBoardState: (newState: LocalStorageBoard) => Promise<void>
}

export default {
    getInitialBoardState,
    clearBoardState,
    clearAllPrivateBoards,
    storeBoardState,
} as BoardLocalStore
