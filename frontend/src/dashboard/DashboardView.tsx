import { h, ListView } from "harmaja"
import * as L from "lonna"
import { exampleBoard, Id } from "../../../common/src/domain"
import { TextInput } from "../components/components"
import { canLogin, UserSessionState } from "../store/user-session-store"
import _ from "lodash"
import { signIn, signOut } from "../google-auth"
import { RecentBoards } from "../store/recent-boards"
import { Dispatch } from "../store/server-connection"
import * as uuid from "uuid"

export const DashboardView = ({
    sessionState,
    dispatch,
    navigateToBoard,
    recentBoards,
}: {
    sessionState: L.Property<UserSessionState>
    recentBoards: RecentBoards
    dispatch: Dispatch
    navigateToBoard: (boardId: Id | undefined) => void
}) => {
    return (
        <div id="root" className="dashboard">
            <h1 id="app-title" data-test="app-title">
                OurBoard
            </h1>
            <p>
                Free and <a href="https://github.com/raimohanska/r-board">open-source</a> online whiteboard.
            </p>
            <RecentBoardsView {...{ recentBoards, navigateToBoard }} />
            <CreateBoard {...{ dispatch, navigateToBoard }} />
            <GoogleLoginArea {...{ sessionState }} />
        </div>
    )
}

const GoogleLoginArea = ({ sessionState }: { sessionState: L.Property<UserSessionState> }) => {
    return (
        <div className="user-auth">
            {L.view(sessionState, (user) => {
                switch (user.status) {
                    case "logged-in":
                        return (
                            <span>
                                You're signed in as {user.name} <button onClick={signOut}>Sign out</button>
                            </span>
                        )
                    default:
                        if (canLogin(user)) {
                            return <button onClick={signIn}>Sign in</button>
                        } else {
                            return null
                        }
                }
            })}
        </div>
    )
}

const RecentBoardsView = ({
    recentBoards,
    navigateToBoard,
}: {
    recentBoards: RecentBoards
    navigateToBoard: (boardId: Id | undefined) => void
}) => {
    const boardsToShow = L.view(recentBoards.recentboards, (bs) =>
        _.sortBy(bs, (b) => b.opened)
            .reverse()
            .slice(0, 15),
    )
    return L.view(
        boardsToShow,
        (recent) => recent.length === 0,
        (empty) =>
            empty ? (
                <Welcome />
            ) : (
                <div className="recent-boards">
                    <h2>Recent boards</h2>
                    <ul>
                        <ListView
                            observable={boardsToShow}
                            getKey={(b) => b.id}
                            renderItem={(b) => (
                                <li>
                                    <a
                                        onClick={(e) => {
                                            navigateToBoard(b.id)
                                            e.preventDefault()
                                        }}
                                        href={`/b/${b.id}`}
                                    >
                                        {b.name}
                                    </a>
                                    <a className="remove" onClick={() => recentBoards.removeRecentBoard(b)}>
                                        remove
                                    </a>
                                </li>
                            )}
                        />
                    </ul>
                </div>
            ),
    )
}

const Welcome = () => {
    return (
        <div>
            <h2>Welcome to OurBoard!</h2>
            <p>
                Please try the <a href={`/b/${exampleBoard.id}`}>Example Board</a>, or create a new board below.
            </p>
        </div>
    )
}
const CreateBoard = ({
    dispatch,
    navigateToBoard,
}: {
    dispatch: Dispatch
    navigateToBoard: (boardId: Id | undefined) => void
}) => {
    const boardName = L.atom("")
    const disabled = L.view(boardName, (n) => !n)

    function createBoard(e: JSX.FormEvent) {
        e.preventDefault()
        const newBoard = { name: boardName.get(), id: uuid.v4() }
        dispatch({ action: "board.add", payload: newBoard })
        setTimeout(() => navigateToBoard(newBoard.id), 100) // TODO: some ack based solution would be more reliable
    }

    return (
        <form onSubmit={createBoard} className="create-board">
            <h2>Create a board</h2>
            <TextInput value={boardName} placeholder="Enter board name" />
            <button data-test="create-board-submit" type="submit" disabled={disabled}>
                Create
            </button>
        </form>
    )
}
