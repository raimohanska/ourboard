import { Fragment, h, ListView } from "harmaja"
import { getNavigator, Link } from "harmaja-router"
import * as L from "lonna"
import * as R from "ramda"
import * as uuid from "uuid"
import {
    BoardAccessPolicy,
    BoardStub,
    exampleBoard,
    RecentBoard,
    AccessListEntry,
    BoardAccessPolicyDefined,
} from "../../../common/src/domain"
import { BOARD_PATH, Routes } from "../board-navigation"
import { localStorageAtom } from "../board/local-storage-atom"
import { Checkbox, TextInput } from "../components/components"
import { signIn, signOut } from "../google-auth"
import { Dispatch } from "../store/board-store"
import { RecentBoards } from "../store/recent-boards"
import { canLogin, LoggedIn, UserSessionState } from "../store/user-session-store"

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
    const lotsOfBoards = L.view(recentBoards.recentboards, (bs) => bs.length >= 2)
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
                                    {L.view(sort, lotsOfBoards, (s, show) =>
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
                (d, s) =>
                    !d && s.status === "logged-in" && <BoardAccessPolicyControls {...{ accessPolicy, user: s }} />,
            )}
        </form>
    )
}

type BoardAccessPolicyControlsProps = {
    accessPolicy: L.Atom<BoardAccessPolicy>
    user: LoggedIn
}
const BoardAccessPolicyControls = ({ accessPolicy, user }: BoardAccessPolicyControlsProps) => {
    const restrictAccessToggle = L.atom(false)
    restrictAccessToggle.onChange((restrict) => {
        accessPolicy.set(restrict ? { allowList: [], publicRead: false } : undefined)
    })

    return [
        <div className="restrict-toggle">
            <input
                id="domain-restrict"
                type="checkbox"
                onChange={(e) => restrictAccessToggle.set(!!e.target.checked)}
            />
            <label htmlFor="domain-restrict">Restrict access to specific domains / email addresses</label>
        </div>,
        L.view(
            accessPolicy,
            (a) => !!a,
            (a) =>
                a && (
                    <BoardAccessPolicyEditor
                        accessPolicy={accessPolicy as L.Atom<BoardAccessPolicyDefined>}
                        user={user}
                    />
                ),
        ),
    ]
}

const BoardAccessPolicyEditor = ({
    accessPolicy,
    user,
}: {
    accessPolicy: L.Atom<BoardAccessPolicyDefined>
    user: LoggedIn
}) => {
    const allowList = L.view(accessPolicy, "allowList")
    const inputRef = L.atom<HTMLInputElement | null>(null)
    const allowPublicReadRaw = L.view(accessPolicy, "publicRead")
    const allowPublicRead = L.atom<boolean>(
        L.view(allowPublicReadRaw, (r) => !!r),
        allowPublicReadRaw.set,
    )
    const currentInputText = L.atom("")

    inputRef.forEach((t) => {
        if (t) {
            // Autofocus email/domain input field for better UX
            t.focus()
        }
    })

    function addToAllowListIfValid(input: string) {
        // LMAO at this validation
        const entry: AccessListEntry | null = input.includes("@")
            ? { email: input, access: "read-write" }
            : input.includes(".")
            ? { domain: input, access: "read-write" }
            : null

        if (entry) {
            allowList.modify((w) => [entry, ...w])
            currentInputText.set("")
        }
    }

    return (
        <>
            <div className="input-and-button">
                <input
                    ref={inputRef}
                    onChange={(e) => currentInputText.set(e.target.value)}
                    type="text"
                    placeholder="e.g. 'mycompany.com' or 'john.doe@mycompany.com'"
                />
                <button
                    onClick={(e) => {
                        e.preventDefault()
                        addToAllowListIfValid(currentInputText.get())
                    }}
                >
                    Add
                </button>
            </div>

            <ListView
                observable={allowList}
                renderItem={(entry) => {
                    return (
                        <div className="input-and-button">
                            <div className="filled-entry">
                                {"domain" in entry
                                    ? `Allowing everyone with an email address ending in ${entry.domain}`
                                    : `Allowing user ${entry.email}`}
                            </div>
                            <button onClick={() => allowList.modify((w) => w.filter((e) => e !== entry))}>
                                Remove
                            </button>
                        </div>
                    )
                }}
            />

            <div className="input-and-button">
                <div className="filled-entry">{`Allowing user ${user.email}`}</div>
                <button disabled>Remove</button>
            </div>

            <p>
                Anyone with the link can view <Checkbox checked={allowPublicRead} />
            </p>
        </>
    )
}
