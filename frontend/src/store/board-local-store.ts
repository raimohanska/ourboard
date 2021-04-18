import { UIEvent, BoardWithHistory, Id, Board, BoardHistoryEntry } from "../../../common/src/domain"
import { migrateBoard } from "../../../common/src/migration"
import * as localForage from "localforage"
import _ from "lodash"

export type LocalStorageBoard = {
    serverShadow: Board
    queue: BoardHistoryEntry[] // serverShadow + queue = current board
    serverHistory: BoardHistoryEntry[] // history until serverShadow (queued events not included)
}

const BOARD_STORAGE_KEY_PREFIX = "board_"

let activeBoardState: LocalStorageBoard | undefined = undefined

export async function getInitialBoardState(boardId: Id) {
    if (!activeBoardState || activeBoardState.serverShadow.id != boardId) {
        const localStorageKey = getStorageKey(boardId)
        try {
            const stringState = await localForage.getItem<string>(localStorageKey)
            activeBoardState = JSON.parse(stringState!) as LocalStorageBoard
            if (!activeBoardState || !activeBoardState.serverShadow) {
                activeBoardState = undefined
            }
            if (activeBoardState) {
                activeBoardState = {
                    ...activeBoardState, // future migration code here
                }
            }
        } catch (e) {
            console.error(`Fetching local state for board ${boardId} from IndexedDB failed`, e)
            await clearBoardState(boardId)
        }
    }
    return activeBoardState
}

function getStorageKey(boardId: string) {
    return BOARD_STORAGE_KEY_PREFIX + boardId
}

const maxLocalStoredHistory = 1000 // TODO: limit history to this, using snapshotting

export async function storeBoardState(newState: LocalStorageBoard) {
    activeBoardState = newState
    storeThrottled(activeBoardState)
}

const storeThrottled = _.throttle(
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

export async function clearBoardState(boardId: Id) {
    activeBoardState = undefined
    const localStorageKey = getStorageKey(boardId)
    try {
        await localForage.removeItem(localStorageKey)
    } catch (err) {
        console.error(`Clearing board state for ${boardId} failed`, err)
    }
}
