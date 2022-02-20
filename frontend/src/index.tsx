import * as H from "harmaja"
import { h } from "harmaja"
import _ from "lodash"
import * as L from "lonna"
import { RecentBoardAttributes } from "../../common/src/domain"
import "./app.scss"
import { BoardNavigation } from "./board-navigation"
import { BoardView } from "./board/BoardView"
import { IS_TOUCHSCREEN } from "./board/touchScreen"
import { DashboardView } from "./dashboard/DashboardView"
import { assetStore } from "./store/asset-store"
import boardLocalStore from "./store/board-local-store"
import { BoardState, BoardStore } from "./store/board-store"
import { CursorsStore } from "./store/cursors-store"
import { RecentBoards } from "./store/recent-boards"
import { BrowserSideServerConnection } from "./store/server-connection"
import { UserSessionStore } from "./store/user-session-store"

const App = () => {
    const { boardId, page } = BoardNavigation()
    const connection = BrowserSideServerConnection()
    const sessionStore = UserSessionStore(connection, localStorage)
    const boardStore = BoardStore(boardId, connection, sessionStore.sessionState, boardLocalStore)
    const cursorsStore = CursorsStore(connection, sessionStore)
    const recentBoards = RecentBoards(connection, sessionStore)
    const assets = assetStore(connection, L.view(boardStore.state, "board"), boardStore.events)
    const title = L.view(boardStore.state, (s) => (s.board && s.board.name ? `${s.board.name} - OurBoard` : "OurBoard"))
    title.forEach((t) => (document.querySelector("title")!.textContent = t))

    boardStore.state
        .pipe(
            L.changes,
            L.filter((s: BoardState) => s.status === "ready" && !!s.board),
            L.map((s: BoardState) => ({ id: s.board!.id, name: s.board!.name } as RecentBoardAttributes)),
            L.skipDuplicates(_.isEqual),
        )
        .forEach(recentBoards.storeRecentBoard)

    return (
        <div className={IS_TOUCHSCREEN ? "touch" : "notouch"}>
            {L.view(page, (page) => {
                switch (page.page) {
                    case "Board":
                        return L.view(
                            boardStore.state,
                            (s) => s.board !== undefined,
                            (hasBoard) =>
                                hasBoard ? (
                                    <BoardView
                                        {...{
                                            boardId: page.boardId,
                                            cursors: cursorsStore,
                                            assets,
                                            boardStore,
                                            sessionState: sessionStore.sessionState,
                                            dispatch: boardStore.dispatch,
                                        }}
                                    />
                                ) : null,
                        )
                    case "NotFound":
                    case "Dashboard":
                        return (
                            <DashboardView
                                {...{
                                    dispatch: boardStore.dispatch,
                                    sessionState: sessionStore.sessionState,
                                    recentBoards,
                                    eventsFromServer: connection.bufferedServerEvents,
                                }}
                            />
                        )
                }
            })}
        </div>
    )
}

H.mount(<App />, document.getElementById("root")!)
