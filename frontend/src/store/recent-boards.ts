import { Board, Id } from "../../../common/src/domain"
import * as L from "lonna"
import { ServerConnection } from "./server-connection"
import { UserSessionState, UserSessionStore } from "./user-session-store"

export type ISODate = string
export type RecentBoardAttributes = { id: Id; name: string }
export type RecentBoard = RecentBoardAttributes & { opened: ISODate }

export function RecentBoards(connection: ServerConnection, sessionStore: UserSessionStore) {
    let recentBoards = L.atom<RecentBoard[]>(localStorage.recentBoards ? JSON.parse(localStorage.recentBoards) : [])

    function storeRecentBoard(board: RecentBoardAttributes) {
        const recentBoard = { name: board.name, id: board.id, opened: new Date().toISOString() }
        storeRecentBoards((boards) => [recentBoard, ...boards.filter((b) => b.id !== board.id)])
    }

    function getRecentBoards() {
        return recentBoards as L.Property<RecentBoard[]>
    }

    function removeRecentBoard(board: RecentBoard) {
        storeRecentBoards((boards) => boards.filter((b) => b.id !== board.id))
    }

    function storeRecentBoards(fn: (boards: RecentBoard[]) => RecentBoard[]) {
        recentBoards.modify(fn)
        localStorage.recentBoards = JSON.stringify(recentBoards.get())
    }

    return {
        storeRecentBoard,
        getRecentBoards,
        removeRecentBoard,
    }
}

export type RecentBoards = ReturnType<typeof RecentBoards>
