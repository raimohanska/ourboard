
import { BoardWithHistory, Id, Serial } from "../../../common/src/domain"


export type LocalStorageBoard = {
    boardWithHistory: BoardWithHistory
    serial: Serial
}

let state: LocalStorageBoard | undefined = undefined

export function getInitialBoardState(boardId: Id) {
    if (!state || state.boardWithHistory.board.id != boardId) {
        const localStorageKey = getStorageKey(boardId)
        state = localStorage[localStorageKey] ? JSON.parse(localStorage[localStorageKey]) as LocalStorageBoard : undefined
    }
    return state
}

function getStorageKey(boardId: string) {
    return `board_${boardId}`
}

export function storeBoardState(newState: LocalStorageBoard) {
    state = newState
    localStorage[getStorageKey(state.boardWithHistory.board.id)] = JSON.stringify(state)
}
