import { Board, Id } from "../../../common/src/domain"
import * as L from "lonna"

export type ISODate = string
export type RecentBoard = { id: Id; name: string; opened: ISODate }

let recentBoards = L.atom<RecentBoard[]>(localStorage.recentBoards ? JSON.parse(localStorage.recentBoards) : [])

export function storeRecentBoard(board: Board) {
    const recentBoard = { name: board.name, id: board.id, opened: new Date().toISOString() }
    storeRecentBoards((boards) => [recentBoard, ...boards.filter((b) => b.id !== board.id)])
}

export function getRecentBoards() {
    return recentBoards
}

export function removeRecentBoard(board: RecentBoard) {
    storeRecentBoards((boards) => boards.filter((b) => b.id !== board.id))
}

function storeRecentBoards(fn: (boards: RecentBoard[]) => RecentBoard[]) {
    recentBoards.modify(fn)
    localStorage.recentBoards = JSON.stringify(recentBoards.get())
}
