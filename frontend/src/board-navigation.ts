import * as L from "lonna"
import { globalScope } from "lonna"
import { Id } from "../../common/src/domain"
import "./app.scss"
import { BoardStore } from "./store/board-store"
import { ServerConnection } from "./store/server-connection"

export function BoardNavigation(connection: ServerConnection, bs: BoardStore) {
    const nicknameFromURL = new URLSearchParams(location.search).get("nickname")
    if (nicknameFromURL) {
        localStorage.nickname = nicknameFromURL
        const search = new URLSearchParams(location.search)
        search.delete("nickname")
        document.location.search = search.toString()
    }

    const initialBoardId = boardIdFromPath()
    const boardIdNavigationRequests = L.bus<Id | undefined>()
    const boardIdFromPopState = L.fromEvent(window, "popstate").pipe(L.map(() => boardIdFromPath()))
    const boardIdChanges = L.merge(boardIdFromPopState, boardIdNavigationRequests)
    const boardId = boardIdChanges.pipe(L.scan(initialBoardId, (prev, next) => next, globalScope))

    connection.connected.onChange((connected) => {
        const bid = boardId.get()
        if (bid && connected) {
            bs.joinBoard(bid)
        }
    })
    // React to board id changes from server (when creating new board at least)
    boardIdChanges.forEach((id) => {
        // Switch socket per board. This terminates the unnecessary board session on server.
        // Also, is preparation for load balancing solution.
        connection.newSocket()
        if (id) bs.joinBoard(id)
        adjustURL(id)
    })

    function adjustURL(bid: Id | undefined) {
        if (boardIdFromPath() === bid) return
        if (bid) {
            history.pushState({}, "", "/b/" + bid)
        } else {
            history.pushState({}, "", "/")
        }
    }

    function boardIdFromPath() {
        const match = document.location.pathname.match(/b\/(.*)/)
        return (match && match[1]) || undefined
    }

    const navigateToBoard = (id: Id | undefined) => {
        boardIdNavigationRequests.push(id)
    }

    const title = L.view(bs.state, (s) => (s.board ? `${s.board.name} - R-Board` : "R-Board"))
    title.forEach((t) => (document.querySelector("title")!.textContent = t))

    return {
        boardId,
        navigateToBoard,
    }
}
