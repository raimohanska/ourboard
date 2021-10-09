import { Fragment, h, ListView } from "harmaja"
import { getNavigator, Link } from "harmaja-router"
import * as L from "lonna"
import * as R from "ramda"
import * as uuid from "uuid"
import { BoardAccessPolicy, BoardStub, exampleBoard, RecentBoard } from "../../../common/src/domain"
import { BOARD_PATH, Routes } from "../board-navigation"
import { localStorageAtom } from "../board/local-storage-atom"
import { BoardAccessPolicyEditor } from "../components/BoardAccessPolicyEditor"
import { TextInput } from "../components/components"
import { signIn, signOut } from "../google-auth"
import { Dispatch } from "../store/board-store"
import { RecentBoards } from "../store/recent-boards"
import { canLogin, UserSessionState } from "../store/user-session-store"

export const DashboardView = ({
    sessionState,
    dispatch,
    recentBoards,
}: {
    sessionState: L.Property<UserSessionState>
    recentBoards: RecentBoards
    dispatch: Dispatch
}) => {
    return (
        <div id="root" className="dashboard">
            <div className="content">
                <header>
                    <h1 id="app-title" data-test="app-title">
                        OurBoard
                    </h1>
                    <p>
                        Free and <a href="https://github.com/raimohanska/r-board">open-source</a> online whiteboard.
                    </p>
                </header>
                <div className="user-info">
                    {L.view(sessionState, (user) => {
                        switch (user.status) {
                            case "logged-in":
                                return (
                                    <>
                                        <span>{user.name}</span> <a onClick={signOut}>Sign out</a>
                                    </>
                                )
                            default:
                                if (canLogin(user)) {
                                    return <a onClick={signIn}>Sign in</a>
                                } else {
                                    return null
                                }
                        }
                    })}
                </div>
                <main>
                    <CreateBoard {...{ dispatch, sessionState }} />
                    <UserDataArea {...{ recentBoards, dispatch, sessionState }} />
                </main>
            </div>
        </div>
    )
}

const UserDataArea = ({
    recentBoards,
    dispatch,
    sessionState,
}: {
    recentBoards: RecentBoards
    dispatch: Dispatch
    sessionState: L.Property<UserSessionState>
}) => {
    return (
        <div>
            {L.view(
                recentBoards.recentboards,
                (recent) => recent.length === 0,
                (empty) =>
                    empty ? (
                        <Welcome />
                    ) : (
                        <div className="user-content">
                            <RecentBoardsView {...{ recentBoards, dispatch }} />
                        </div>
                    ),
            )}
        </div>
    )
}

const RecentBoardsView = ({ recentBoards, dispatch }: { recentBoards: RecentBoards; dispatch: Dispatch }) => {
    const navigator = getNavigator<Routes>()
    const defaultLimit = 25
    const filter = L.atom("")

    const limit = localStorageAtom("recentBoards.limit", defaultLimit)

    const sort = localStorageAtom<"recent-first" | "alphabetical">("recentBoards.sort", "recent-first")

    const matchingBoards = L.view(recentBoards.recentboards, filter, (bs, f) =>
        bs.filter((b) => b.name.toLowerCase().includes(f)),
    )
    const boardsToShow = L.view(matchingBoards, limit, sort, filter, (bs, l, s, f) =>
        R.pipe(
            R.sortWith([R.descend(R.prop("opened"))]),
            (bs: RecentBoard[]) => bs.slice(0, l),
            R.sortWith([s === "alphabetical" ? R.ascend((b) => b.name.toLowerCase()) : R.descend(R.prop("opened"))]),
        )(bs),
    )
    const moreBoards = L.view(limit, matchingBoards, (l, bs) => bs.length - l)
    const inputRef = (e: HTMLInputElement) => {
        setTimeout(() => e.focus(), 0)
    }
    const onKeyDown = (e: JSX.KeyboardEvent) => {
        if (e.keyCode === 13) {
            const board = boardsToShow.get()[0]
            if (board) {
                navigator.navigateByParams(BOARD_PATH, { boardId: board.id })
            }
        }
    }
    const aLot = 7
    const lotsOfBoards = L.view(recentBoards.recentboards, (bs) => bs.length >= aLot)
    const lotsOfShownBoards = L.view(matchingBoards, (bs) => bs.length >= aLot)
    return (
        <div>
            {L.view(
                recentBoards.recentboards,
                (recent) => recent.length === 0,
                (empty) =>
                    empty ? (
                        <Welcome />
                    ) : (
                        <div className="recent-boards">
                            <h2>Your recent boards</h2>
                            {L.view(lotsOfBoards, (show) =>
                                show ? (
                                    <div className="search">
                                        <TextInput
                                            onKeyDown={onKeyDown}
                                            ref={inputRef}
                                            value={filter}
                                            placeholder="Search, hit enter!"
                                        />
                                    </div>
                                ) : null,
                            )}
                            <ul>
                                <ListView
                                    observable={boardsToShow}
                                    getKey={(b) => b.id}
                                    renderItem={(b) => (
                                        <li>
                                            <Link<Routes> route={BOARD_PATH} boardId={b.id}>
                                                {b.name}
                                            </Link>
                                            <a className="remove" onClick={() => recentBoards.removeRecentBoard(b)}>
                                                remove
                                            </a>
                                        </li>
                                    )}
                                />
                                {L.view(matchingBoards, filter, (bs, f) => {
                                    function createBoard() {
                                        const newBoard: BoardStub = { name: f, id: uuid.v4() }
                                        dispatch({ action: "board.add", payload: newBoard })
                                        setTimeout(
                                            () => navigator.navigateByParams(BOARD_PATH, { boardId: newBoard.id }),
                                            100,
                                        ) // TODO: some ack based solution would be more reliable
                                    }
                                    return bs.length === 0 && f.length >= 3 ? (
                                        <li>
                                            <a onClick={createBoard}>Create a new board named {f}</a>
                                        </li>
                                    ) : null
                                })}
                            </ul>
                            {
                                <div className="view-options">
                                    {L.view(moreBoards, limit, (c, l) =>
                                        c > 0 ? (
                                            <a
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    limit.set(Number.MAX_SAFE_INTEGER)
                                                }}
                                            >
                                                Show {moreBoards} more
                                            </a>
                                        ) : l === defaultLimit ? null : (
                                            <a
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    limit.set(defaultLimit)
                                                }}
                                            >
                                                Show less
                                            </a>
                                        ),
                                    )}
                                    {L.view(sort, lotsOfShownBoards, (s, show) =>
                                        show ? (
                                            s === "alphabetical" ? (
                                                <a
                                                    href="#"
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        sort.set("recent-first")
                                                    }}
                                                >
                                                    Show recent first
                                                </a>
                                            ) : (
                                                <a
                                                    href="#"
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        sort.set("alphabetical")
                                                    }}
                                                >
                                                    Sort alphabetically
                                                </a>
                                            )
                                        ) : null,
                                    )}
                                </div>
                            }
                        </div>
                    ),
            )}
        </div>
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
    sessionState,
}: {
    dispatch: Dispatch
    sessionState: L.Property<UserSessionState>
}) => {
    const boardName = L.atom("")
    const disabled = L.view(boardName, (n) => !n)
    const navigator = getNavigator<Routes>()
    const accessPolicy: L.Atom<BoardAccessPolicy | undefined> = L.atom(undefined)
    sessionState.onChange((s) => {
        if (s.status !== "logged-in") {
            accessPolicy.set(undefined)
        }
    })
    accessPolicy.log()

    function createBoard(e: JSX.FormEvent) {
        e.preventDefault()
        const newBoard: BoardStub = { name: boardName.get(), id: uuid.v4() }

        const ap = accessPolicy.get()
        const ss = sessionState.get()

        if (ap && ss.status === "logged-in") {
            // Always add board creator's email to allowlist,
            // And show it as a disabled input in the allowlist form.
            newBoard.accessPolicy = { ...ap, allowList: ap.allowList.concat({ email: ss.email, access: "read-write" }) }
        }
        dispatch({ action: "board.add", payload: newBoard })
        setTimeout(() => navigator.navigateByParams(BOARD_PATH, { boardId: newBoard.id }), 100) // TODO: some ack based solution would be more reliable
    }

    return (
        <form onSubmit={createBoard} className="create-board">
            <h2>Create a board</h2>
            <div className="input-and-button">
                <TextInput value={boardName} placeholder="Enter board name" />
                <button id="create-board-button" data-test="create-board-submit" type="submit" disabled={disabled}>
                    Create
                </button>
            </div>
            {L.view(
                disabled,
                sessionState,
                (d, s) => !d && s.status === "logged-in" && <BoardAccessPolicyEditor {...{ accessPolicy, user: s }} />,
            )}
        </form>
    )
}
