import * as H from "harmaja"
import * as L from "lonna"
import { h } from "harmaja"
import io from "socket.io-client"
import "./app.scss"
import { BoardAppState, stateStore } from "./store/state-store"
import { BoardView } from "./board/BoardView"
import { syncStatusStore } from "./store/sync-status-store"
import { UserCursorPosition } from "../../common/src/domain"
import { DashboardView } from "./dashboard/DashboardView"
import { assetStore } from "./store/asset-store"
import { storeRecentBoard } from "./store/recent-boards"
import { userInfo } from "./google-auth"

const App = () => {
    const nicknameFromURL = new URLSearchParams(location.search).get("nickname")
    if (nicknameFromURL) {
        localStorage.nickname = nicknameFromURL
        const search = new URLSearchParams(location.search)
        search.delete("nickname")
        document.location.search = search.toString()
    }
    const socket = io()

    const boardId = boardIdFromPath()

    const store = stateStore(socket, boardId, localStorage)
    const assets = assetStore(socket, store)
    const syncStatus = syncStatusStore(socket, store.queueSize)
    const showingBoardId = store.state.pipe(L.map((s: BoardAppState) => (s.board ? s.board.id : undefined)))
    const cursors: L.Property<UserCursorPosition[]> = L.view(store.state, (s) => {
        const otherCursors = { ...s.cursors }
        s.userId && delete otherCursors[s.userId]
        return Object.values(otherCursors)
    })
    const state = store.state

    const title = L.view(store.state, (s) => (s.board ? `${s.board.name} - R-Board` : "R-Board"))
    title.forEach((t) => (document.querySelector("title")!.textContent = t))

    const connectedBoard = L.view(store.connected, (c) => (c ? boardId : undefined))

    connectedBoard.forEach((boardId) => {
        if (!boardId) {
            // no board in URL or not connected
        } else {
            store.joinBoard(boardId)
        }
    })
    L.merge(
        store.connected.pipe(
            L.changes,
            L.filter((c: boolean) => c),
        ),
        userInfo.pipe(L.changes),
    ).forEach(() => {
        const user = userInfo.get()
        switch (user.status) {
            case "signed-in":
                store.dispatch({ action: "nickname.set", nickname: user.name, userId: state.get().userId! })
                store.dispatch({ action: "auth.login", name: user.name, email: user.email, token: user.token })
                return
            case "signed-out":
                return store.dispatch({ action: "auth.logout" })
        }
    })
    showingBoardId.forEach((boardId) => {
        if (boardId && boardId !== store.boardId.get()) {
            document.location.replace("/b/" + boardId)
        }
    })

    L.view(store.state, "board").forEach((b) => {
        b && storeRecentBoard(b)
    })

    return L.view(store.boardId, (boardId) =>
        boardId ? (
            L.view(
                showingBoardId,
                (boardId) =>
                    !!boardId && (
                        <BoardView
                            {...{
                                boardId,
                                cursors,
                                assets,
                                state,
                                dispatch: store.dispatch,
                                syncStatus,
                            }}
                        />
                    ),
            )
        ) : (
            <DashboardView {...{ dispatch: store.dispatch, state }} />
        ),
    )
}

H.mount(<App />, document.getElementById("root")!)

function boardIdFromPath() {
    const match = document.location.pathname.match(/b\/(.*)/)
    return (match && match[1]) || undefined
}
