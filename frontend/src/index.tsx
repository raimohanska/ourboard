import * as H from "harmaja"
import * as L from "lonna"
import { h } from "harmaja"

import "./app.scss"
import { BaseSessionState, UserSessionState, userSessionStore } from "./store/user-session-store"
import { BoardView } from "./board/BoardView"
import { DashboardView } from "./dashboard/DashboardView"
import { assetStore } from "./store/asset-store"
import { RecentBoardAttributes, storeRecentBoard } from "./store/recent-boards"
import { serverConnection } from "./store/server-connection"
import { BoardState, BoardStore } from "./store/board-store"
import _ from "lodash"
import { BoardNavigation } from "./board-navigation"

export type BoardAppState = BoardState & BaseSessionState

const App = () => {
    const connection = serverConnection()
    const userStore = userSessionStore(connection, localStorage)
    const boardStore = BoardStore(connection, userStore.sessionState)
    const { boardId, navigateToBoard } = BoardNavigation(connection, boardStore)

    const assets = assetStore(connection, L.view(boardStore.state, "board"), connection.events)

    boardStore.state.pipe(
        L.changes,
        L.filter((s: BoardState) => s.status === "ready" && !!s.board),
        L.map((s: BoardState) => ({ id: s.board!.id, name: s.board!.name}) as RecentBoardAttributes),
        L.skipDuplicates(_.isEqual)
    ).forEach(storeRecentBoard)

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
