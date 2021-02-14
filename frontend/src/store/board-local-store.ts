import { BoardWithHistory, Id, Serial } from "../../../common/src/domain"

export type LocalStorageBoard = {
    boardWithHistory: BoardWithHistory
    serial: Serial
}

let state: LocalStorageBoard | undefined = undefined

export function getInitialBoardState(boardId: Id) {
    if (!state || state.boardWithHistory.board.id != boardId) {
        const localStorageKey = getStorageKey(boardId)
        state = localStorage[localStorageKey]
            ? (JSON.parse(localStorage[localStorageKey]) as LocalStorageBoard)
            : undefined
    }
    return state
}

function getStorageKey(boardId: string) {
    return `board_${boardId}`
}

const maxLocalStoredHistory = 1000

export function storeBoardState(newState: LocalStorageBoard) {
    state = newState
    const history = newState.boardWithHistory.history
    const recentHistory = history.slice(history.length - maxLocalStoredHistory, history.length)
    state = { ...newState, boardWithHistory: { ...newState.boardWithHistory, history: recentHistory } }
    console.log("Storing", JSON.stringify(state).length)
    localStorage[getStorageKey(state.boardWithHistory.board.id)] = JSON.stringify(state)
}
