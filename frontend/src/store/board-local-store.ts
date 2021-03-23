import { BoardWithHistory, Id } from "../../../common/src/domain"
import { migrateBoard } from "../../../common/src/migration"
import * as localForage from "localforage"

export type LocalStorageBoard = {
    boardWithHistory: BoardWithHistory
}

const BOARD_STORAGE_KEY_PREFIX = "board_"

const storedBoardStates: Record<string, LocalStorageBoard> = {}

export const storedBoardsLoaded = localForage
    .keys()
    .then((keys) =>
        Promise.all(
            keys.map(async (k) => {
                if (!k.startsWith(BOARD_STORAGE_KEY_PREFIX)) return
                try {
                    const stringState = await localForage.getItem<string>(k)
                    storedBoardStates[k] = JSON.parse(stringState!) as LocalStorageBoard
                } catch (e) {
                    console.error(`Getting key ${k} from IndexedDB failed`, err)
                }
            }),
        ),
    )
    .catch((err) => {
        console.error("Loading boards from IndexedDB failed", err)
    })

let activeBoardState: LocalStorageBoard | undefined = undefined

export function getInitialBoardState(boardId: Id) {
    if (!activeBoardState || activeBoardState.boardWithHistory.board.id != boardId) {
        const localStorageKey = getStorageKey(boardId)
        activeBoardState = storedBoardStates[localStorageKey]
        if (activeBoardState && !activeBoardState.boardWithHistory.board.serial) {
            activeBoardState = undefined // Discard earlier stored versions where serial was not part of Board
        }
    }
    return activeBoardState && activeBoardState.boardWithHistory
        ? {
              ...activeBoardState,
              boardWithHistory: {
                  ...activeBoardState.boardWithHistory,
                  board: migrateBoard(activeBoardState.boardWithHistory.board),
              },
          }
        : activeBoardState
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
    await localForage
        .setItem(getStorageKey(activeBoardState.boardWithHistory.board.id), JSON.stringify(activeBoardState))
        .catch((err) => {
            console.error(`Saving board state for ${newState.boardWithHistory.board.id} failed`, err)
        })
}

export async function clearBoardState(boardId: Id) {
    activeBoardState = undefined
    await localForage.removeItem(getStorageKey(boardId)).catch((err) => {
        console.error(`Clearing board state for ${boardId} failed`, err)
    })
}
