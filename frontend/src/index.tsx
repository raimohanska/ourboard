import * as H from "harmaja"
import * as L from "lonna"
import { h } from "harmaja"

import "./app.scss"
import { UserSessionStore } from "./store/user-session-store"
import { BoardView } from "./board/BoardView"
import { DashboardView } from "./dashboard/DashboardView"
import { assetStore } from "./store/asset-store"
import { RecentBoards } from "./store/recent-boards"
import { serverConnection } from "./store/server-connection"
import { BoardState, BoardStore } from "./store/board-store"
import _ from "lodash"
import { boardIdFromPath, BoardNavigation } from "./board-navigation"
import { RecentBoardAttributes } from "../../common/src/domain"

const App = () => {
    const connection = serverConnection(boardIdFromPath())
    const sessionStore = UserSessionStore(connection, localStorage)
    const boardStore = BoardStore(connection, sessionStore.sessionState)
    const { boardId, navigateToBoard } = BoardNavigation(connection, boardStore)
    const recentBoards = RecentBoards(connection, sessionStore)
    const assets = assetStore(connection, L.view(boardStore.state, "board"), connection.events)

    boardStore.state
        .pipe(
            L.changes,
            L.filter((s: BoardState) => s.status === "ready" && !!s.board),
            L.map((s: BoardState) => ({ id: s.board!.id, name: s.board!.name } as RecentBoardAttributes)),
            L.skipDuplicates(_.isEqual),
        )
        .forEach(recentBoards.storeRecentBoard)

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
                            boardState: boardStore.state,
                            sessionState: sessionStore.sessionState,
                            dispatch: connection.dispatch,
                            navigateToBoard,
                        }}
                    />
                ) : null
            ) : (
                <DashboardView
                    {...{
                        dispatch: connection.dispatch,
                        sessionState: sessionStore.sessionState,
                        recentBoards,
                        navigateToBoard,
                    }}
                />
            ),
    )
}

H.mount(<App />, document.getElementById("root")!)
