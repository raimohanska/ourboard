import { Board, Id } from "../../../common/src/domain"
import * as L from "lonna"

export type ISODate = string
export type RecentBoardAttributes = { id: Id; name: string }
export type RecentBoard = RecentBoardAttributes & { opened: ISODate }

let recentBoards = L.atom<RecentBoard[]>(localStorage.recentBoards ? JSON.parse(localStorage.recentBoards) : [])

export function storeRecentBoard(board: RecentBoardAttributes) {
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
