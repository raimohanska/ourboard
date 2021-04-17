import { Board, Id, RecentBoard, RecentBoardAttributes } from "../../../common/src/domain"
import * as L from "lonna"
import { ServerConnection } from "./server-connection"
import { getAuthenticatedUser, UserSessionStore } from "./user-session-store"

export function RecentBoards(connection: ServerConnection, sessionStore: UserSessionStore) {
    let recentBoards = L.atom<RecentBoard[]>(localStorage.recentBoards ? JSON.parse(localStorage.recentBoards) : [])

    function storeRecentBoard(board: RecentBoardAttributes) {
        const userEmail = getAuthenticatedUser(sessionStore.sessionState.get())?.email || null
        const recentBoard = { name: board.name, id: board.id, opened: new Date().toISOString(), userEmail }
        storeRecentBoardLocally(recentBoard)
    }

    function storeRecentBoardLocally(recentBoard: RecentBoard) {
        storeRecentBoards((boards) => [recentBoard, ...boards.filter((b) => b.id !== recentBoard.id)])
    }

    function removeRecentBoard(board: RecentBoard) {
        storeRecentBoards((boards) => boards.filter((b) => b.id !== board.id))
        connection.send({ action: "board.dissociate", boardId: board.id })
    }

    function storeRecentBoards(fn: (boards: RecentBoard[]) => RecentBoard[]) {
        recentBoards.modify(fn)
        localStorage.recentBoards = JSON.stringify(recentBoards.get())
    }

    connection.bufferedServerEvents.subscribe((e) => {
        if (e.action === "user.boards") {
            // Board list from server, let's sync
            const boardsFromServer = e.boards
            const localBoards = recentBoards.get()
            const boardsOnlyFoundLocally = localBoards.filter((b) => !boardsFromServer.some((bs) => bs.id === b.id))
            const boardsToSend = boardsOnlyFoundLocally.filter((b) => !b.userEmail || b.userEmail === e.email)
            boardsToSend.forEach((b) =>
                connection.send({ action: "board.associate", boardId: b.id, lastOpened: b.opened }),
            )
            storeRecentBoards(() => [...boardsFromServer, ...boardsOnlyFoundLocally])
        }
    })

    return {
        storeRecentBoard,
        recentboards: recentBoards as L.Property<RecentBoard[]>,
        removeRecentBoard,
    }
}

export type RecentBoards = ReturnType<typeof RecentBoards>
