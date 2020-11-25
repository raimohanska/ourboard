import { Board, Id } from "../../../common/src/domain"

export type ISODate = string
export type RecentBoard = { id: Id, name: string, opened: ISODate }

let recentBoards: RecentBoard[] = localStorage.recentBoards ? JSON.parse(localStorage.recentBoards) : []

export function storeRecentBoard(board: Board) {
    const recentBoard = { name: board.name, id: board.id, opened: new Date().toISOString() }
    recentBoards = recentBoards.filter(b => b.id !== board.id).concat(recentBoard)
    localStorage.recentBoards = JSON.stringify(recentBoards)
}

export function getRecentBoards() {
    return recentBoards
}