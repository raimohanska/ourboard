import * as H from "harmaja"
import * as L from "lonna"
import { h } from "harmaja"

import "./app.scss"
import { PartialState, stateStore } from "./store/state-store"
import { BoardView } from "./board/BoardView"
import { syncStatusStore } from "./store/sync-status-store"
import { BoardHistoryEntry, Id, ItemLocks, UserCursorPosition, UserSessionInfo } from "../../common/src/domain"
import { DashboardView } from "./dashboard/DashboardView"
import { assetStore } from "./store/asset-store"
import { storeRecentBoard } from "./store/recent-boards"
import { userInfo } from "./google-auth"
import { serverConnection } from "./store/server-connection"
import { boardStore, BoardState } from "./store/board-store"
import { getInitialBoardState } from "./store/board-local-store"

export type BoardAppState = BoardState & PartialState

const App = () => {
    const nicknameFromURL = new URLSearchParams(location.search).get("nickname")
    if (nicknameFromURL) {
        localStorage.nickname = nicknameFromURL
        const search = new URLSearchParams(location.search)
        search.delete("nickname")
        document.location.search = search.toString()
    }

    const boardId = L.constant(boardIdFromPath())
    const connection = serverConnection()
    const store = stateStore(connection, localStorage)
    const bs = boardStore(
        connection.bufferedServerEvents,
        connection.uiEvents,
        connection.messageQueue,
        store.userInfo,
        store.sessionId,
    )
    const assets = assetStore(connection.socket, L.view(bs.state, "board"), connection.events)
    const syncStatus = syncStatusStore(connection.socket, connection.queueSize)
    const showingBoardId = bs.state.pipe(L.map((s: BoardState) => (s.board ? s.board.id : undefined)))

    const title = L.view(bs.state, (s) => (s.board ? `${s.board.name} - R-Board` : "R-Board"))
    title.forEach((t) => (document.querySelector("title")!.textContent = t))

    const connectedBoard = L.view(connection.connected, (c) => (c ? boardId.get() : undefined))

    connectedBoard.forEach((boardId) => {
        if (!boardId) {
            // no board in URL or not connected
        } else {
            joinBoard(boardId)
        }
    })
    L.merge(
        connection.connected.pipe(
            L.changes,
            L.filter((c: boolean) => c),
        ),
        userInfo.pipe(L.changes),
    ).forEach(() => {
        const user = userInfo.get()
        switch (user.status) {
            case "signed-in":
                connection.dispatch({ action: "nickname.set", nickname: user.name, userId: store.sessionId.get()! })
                connection.dispatch({ action: "auth.login", name: user.name, email: user.email, token: user.token })
                return
            case "signed-out":
                return connection.dispatch({ action: "auth.logout" })
        }
    })
    showingBoardId.forEach((bid) => {
        if (bid && bid !== boardId.get()) {
            document.location.replace("/b/" + bid)
        }
    })

    L.view(bs.state, "board").forEach((b) => {
        b && storeRecentBoard(b)
    })

    const state = L.view(store.state, bs.state, (s, bs) => ({ ...s, ...bs }))

    return L.view(boardId, (boardId) =>
        boardId ? (
            L.view(
                showingBoardId,
                (boardId) =>
                    !!boardId && (
                        <BoardView
                            {...{
                                boardId,
                                cursors: L.view(bs.state, "cursors"),
                                assets,
                                state,
                                dispatch: connection.dispatch,
                                syncStatus,
                            }}
                        />
                    ),
            )
        ) : (
            <DashboardView {...{ dispatch: connection.dispatch, state }} />
        ),
    )

    function joinBoard(boardId: Id) {
        console.log("Joining board", boardId)
        connection.dispatch({
            action: "board.join",
            boardId,
            initAtSerial: getInitialBoardState(boardId)?.boardWithHistory.board.serial,
        })
    }
}

H.mount(<App />, document.getElementById("root")!)

function boardIdFromPath() {
    const match = document.location.pathname.match(/b\/(.*)/)
    return (match && match[1]) || undefined
}
