import { BoardWithHistory, Id } from "../../../common/src/domain"
import { migrateBoard } from "../../../common/src/migration"
import * as localForage from "localforage"

export type LocalStorageBoard = {
    boardWithHistory: BoardWithHistory
}

const BOARD_STORAGE_KEY_PREFIX = "board_"

let activeBoardState: LocalStorageBoard | undefined = undefined

export async function getInitialBoardState(boardId: Id) {
    if (!activeBoardState || activeBoardState.boardWithHistory.board.id != boardId) {
        const localStorageKey = getStorageKey(boardId)
        try {
            const stringState = await localForage.getItem<string>(localStorageKey)
            activeBoardState = JSON.parse(stringState!) as LocalStorageBoard
            if (activeBoardState && activeBoardState.boardWithHistory) {
                activeBoardState = {
                    ...activeBoardState,
                    boardWithHistory: {
                        ...activeBoardState.boardWithHistory,
                        board: migrateBoard(activeBoardState.boardWithHistory.board),
                    },
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

const maxLocalStoredHistory = 1000

export async function storeBoardState(newState: LocalStorageBoard) {
    activeBoardState = newState
    const history = newState.boardWithHistory.history
    const recentHistory = history.slice(history.length - maxLocalStoredHistory, history.length)
    activeBoardState = { ...newState, boardWithHistory: { ...newState.boardWithHistory, history: recentHistory } }
    //console.log(`Storing ${JSON.stringify(state).length} characters`)
    try {
        await localForage.setItem(
            getStorageKey(activeBoardState.boardWithHistory.board.id),
            JSON.stringify(activeBoardState),
        )
    } catch (err) {
        console.error(`Saving board state for ${newState.boardWithHistory.board.id} failed`, err)
    }
}

export async function clearBoardState(boardId: Id) {
    activeBoardState = undefined
    const localStorageKey = getStorageKey(boardId)
    try {
        await localForage.removeItem(localStorageKey)
    } catch (err) {
        console.error(`Clearing board state for ${boardId} failed`, err)
    }
}
