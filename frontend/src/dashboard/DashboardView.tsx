import { Fragment, h, ListView } from "harmaja"
import { getNavigator, Link } from "harmaja-router"
import * as L from "lonna"
import * as R from "ramda"
import * as uuid from "uuid"
import { BoardAccessPolicy, EventFromServer, exampleBoard, RecentBoard } from "../../../common/src/domain"
import { BOARD_PATH, createBoardAndNavigate, Routes } from "../board-navigation"
import { localStorageAtom } from "../board/local-storage-atom"
import { IS_TOUCHSCREEN } from "../board/touchScreen"
import { BoardAccessPolicyEditor } from "../components/BoardAccessPolicyEditor"
import { TextInput } from "../components/components"
import { signIn, signOut } from "../google-auth"
import { Dispatch } from "../store/board-store"
import { RecentBoards } from "../store/recent-boards"
import { canLogin, defaultAccessPolicy, UserSessionState } from "../store/user-session-store"

export const DashboardView = ({
    sessionState,
    dispatch,
    recentBoards,
    eventsFromServer,
}: {
    sessionState: L.Property<UserSessionState>
    recentBoards: RecentBoards
    dispatch: Dispatch
    eventsFromServer: L.EventStream<EventFromServer>
}) => {
    const boardName = L.atom("")
    return (
        <div id="root" className="dashboard">
            <div className="content">
                <header>
                    <h1 id="app-title" data-test="app-title">
                        OurBoard
                    </h1>
                    <p>
                        Free and <a href="https://github.com/raimohanska/r-board">open-source</a>{" "}
                        online&nbsp;whiteboard.
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
                    <CreateBoard {...{ dispatch, sessionState, boardName, recentBoards, eventsFromServer }} />
                    <div>
                        <div className="user-content">
                            <RecentBoardsView {...{ recentBoards, boardName }} />
                        </div>
                    </div>
                    <Welcome {...{ recentBoards, dispatch, eventsFromServer, sessionState }} />
                </main>
            </div>
        </div>
    )
}

const RecentBoardsView = ({ recentBoards, boardName }: { recentBoards: RecentBoards; boardName: L.Atom<string> }) => {
    const defaultLimit = 25
    const filter = boardName
    const filtered = L.view(filter, (f) => !!f)
    const edit = L.atom(false)
    const limit = localStorageAtom("recentBoards.limit", defaultLimit)

    const sort = localStorageAtom<"recent-first" | "alphabetical">("recentBoards.sort", "recent-first")

    const matchingBoards = L.view(recentBoards.recentboards, filter, (bs, f) =>
        bs.filter((b) => b.name.toLowerCase().includes(f.toLowerCase())),
    )
    const boardsToShow = L.view(matchingBoards, limit, sort, filter, (bs, l, s, f) =>
        R.pipe(
            R.sortWith([R.descend(R.prop("opened"))]),
            (bs: RecentBoard[]) => bs.slice(0, l),
            R.sortWith([s === "alphabetical" ? R.ascend((b) => b.name.toLowerCase()) : R.descend(R.prop("opened"))]),
        )(bs),
    )
    const moreBoards = L.view(limit, matchingBoards, (l, bs) => bs.length - l)
    const aLot = 7
    const lotsOfShownBoards = L.view(matchingBoards, (bs) => bs.length >= aLot)
    return (
        <div>
            {L.view(
                matchingBoards,
                (recent) => recent.length === 0,
                (empty) =>
                    empty ? null : (
                        <div
                            className={L.view(
                                edit,
                                filtered,
                                (e, f) => `recent-boards${e ? " edit" : ""}${f ? " filtered" : ""}`,
                            )}
                        >
                            <h2>
                                {L.view(filter, (f) =>
                                    f === "" ? "Your recent boards" : "Found in your recent boards",
                                )}
                                {IS_TOUCHSCREEN && (
                                    <a className="edit" onClick={() => edit.modify((e) => !e)}>
                                        {L.view(edit, (e) => (e ? "done" : "edit"))}
                                    </a>
                                )}
                            </h2>
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

const Welcome = ({
    recentBoards,
    dispatch,
    eventsFromServer,
    sessionState,
}: {
    recentBoards: RecentBoards
    dispatch: Dispatch
    eventsFromServer: L.EventStream<EventFromServer>
    sessionState: L.Property<UserSessionState>
}) => {
    const navigator = getNavigator<Routes>()
    function createTutorial() {
        createBoardAndNavigate(
            {
                id: uuid.v4(),
                name: "My personal tutorial board",
                templateId: "tutorial",
                accessPolicy: defaultAccessPolicy(sessionState.get(), false),
            },
            dispatch,
            navigator,
            eventsFromServer,
        )
    }
    const showExampleLink = L.view(recentBoards.recentboards, (boards) => !boards.some((b) => b.id === exampleBoard.id))
    return (
        <span>
            {L.view(
                recentBoards.recentboards,
                (recent) => recent.length < 3 && !recent.some((b) => b.name.toLowerCase().includes("tutorial")),
                (empty) =>
                    empty ? (
                        <div>
                            <h2>Welcome to OurBoard!</h2>
                            <p>
                                Let us create a <a onClick={createTutorial}>Tutorial Board</a> just for you, or go ahead
                                and create a new blank board above.{" "}
                                {L.view(showExampleLink, (s) =>
                                    s ? (
                                        <>
                                            You may also check out the{" "}
                                            <a href={`/b/${exampleBoard.id}`}>Shared test board</a> if you dare!
                                        </>
                                    ) : null,
                                )}
                            </p>
                        </div>
                    ) : null,
            )}
        </span>
    )
}

const CreateBoardOptions = ({
    accessPolicy,
    sessionState,
}: {
    accessPolicy: L.Atom<BoardAccessPolicy | undefined>
    sessionState: L.Property<UserSessionState>
}) => {
    return L.view(
        sessionState,
        (s) => s.status === "logged-in" && <BoardAccessPolicyEditor {...{ accessPolicy, user: s }} />,
    )
}

const CreateBoard = ({
    dispatch,
    sessionState,
    boardName,
    recentBoards,
    eventsFromServer,
}: {
    dispatch: Dispatch
    sessionState: L.Property<UserSessionState>
    boardName: L.Atom<string>
    recentBoards: RecentBoards
    eventsFromServer: L.EventStream<EventFromServer>
}) => {
    const disabled = L.view(boardName, (n) => !n)
    const navigator = getNavigator<Routes>()
    const accessPolicy: L.Atom<BoardAccessPolicy | undefined> = L.atom(defaultAccessPolicy(sessionState.get(), false))
    sessionState.onChange((s) => {
        accessPolicy.set(defaultAccessPolicy(s, false))
    })
    const hasRecentBoards = L.view(recentBoards.recentboards, (bs) => bs.length > 0)

    function onSubmit(e: JSX.FormEvent) {
        e.preventDefault()
        const newBoard = { name: boardName.get(), id: uuid.v4(), accessPolicy: accessPolicy.get() }
        createBoardAndNavigate(newBoard, dispatch, navigator, eventsFromServer)
    }

    return (
        <form onSubmit={onSubmit} className="create-board">
            <h2>{L.view(hasRecentBoards, (has) => (has ? "Find or create a board" : "Create a board"))}</h2>
            <div className="input-and-button">
                <TextInput value={boardName} autoFocus={!IS_TOUCHSCREEN} placeholder="Enter board name" />
                <button id="create-board-button" data-test="create-board-submit" type="submit" disabled={disabled}>
                    Create
                </button>
            </div>
            {L.view(disabled, (d) => !d && <CreateBoardOptions {...{ accessPolicy, sessionState }} />)}
        </form>
    )
}
