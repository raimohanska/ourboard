import * as H from "harmaja"
import * as L from "lonna"
import { h } from "harmaja"

import "./app.scss"
import { UserSessionState, userSessionStore } from "./store/user-session-store"
import { BoardView } from "./board/BoardView"
import { DashboardView } from "./dashboard/DashboardView"
import { assetStore } from "./store/asset-store"
import { storeRecentBoard } from "./store/recent-boards"
import { serverConnection } from "./store/server-connection"
import { BoardState, BoardStore } from "./store/board-store"
import _ from "lodash"
import { BoardNavigation } from "./board-navigation"

export type BoardAppState = BoardState & UserSessionState

const App = () => {
    const connection = serverConnection()
    const userStore = userSessionStore(connection, localStorage)
    const boardStore = BoardStore(connection, userStore.userInfo, userStore.sessionId)
    const { boardId, navigateToBoard } = BoardNavigation(connection, boardStore)

    const assets = assetStore(connection, L.view(boardStore.state, "board"), connection.events)

    L.view(boardStore.state, (s) => (s.board ? { id: s.board.id, name: s.board.name } : null))
        .pipe(L.skipDuplicates(_.isEqual))
        .forEach((b) => {
            b && storeRecentBoard(b)
        })

    const state = L.view(userStore.sessionState, boardStore.state, (s, bs) => ({ ...s, ...bs }))

    return L.view(
        boardId,
        L.view(boardStore.state, (s) => s.board !== undefined),
        (boardId, hasBoard) =>
            boardId ? (
                hasBoard ? (
                    <BoardView
                        {...{
                            boardId,
                            cursors: L.view(boardStore.state, "cursors"),
                            assets,
                            state,
                            dispatch: connection.dispatch,
                            navigateToBoard,
                        }}
                    />
                ) : null
            ) : (
                <DashboardView {...{ dispatch: connection.dispatch, state, navigateToBoard }} />
            ),
    )
}

H.mount(<App />, document.getElementById("root")!)
