import { h, Fragment, ListView } from "harmaja"
import * as L from "lonna"
import { BoardAccessPolicy, BoardStub, exampleBoard, Id, RecentBoard } from "../../../common/src/domain"
import { TextInput } from "../components/components"
import { canLogin, UserSessionState } from "../store/user-session-store"
import _ from "lodash"
import * as R from "ramda"
import { signIn, signOut } from "../google-auth"
import { RecentBoards } from "../store/recent-boards"
import { Dispatch } from "../store/board-store"
import * as uuid from "uuid"
import { localStorageAtom } from "../board/local-storage-atom"

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
            <RecentBoardsView {...{ recentBoards, navigateToBoard, dispatch }} />
            <CreateBoard {...{ dispatch, navigateToBoard, sessionState }} />
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
    dispatch,
}: {
    recentBoards: RecentBoards
    navigateToBoard: (boardId: Id | undefined) => void
    dispatch: Dispatch
}) => {
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
                navigateToBoard(board.id)
            }
        }
    }
    const lotsOfBoards = L.view(recentBoards.recentboards, (bs) => bs.length >= 10)
    return L.view(
        recentBoards.recentboards,
        (recent) => recent.length === 0,
        (empty) =>
            empty ? (
                <Welcome />
            ) : (
                <div className="recent-boards">
                    <h2>Recent boards</h2>
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
                        {L.view(matchingBoards, filter, (bs, f) => {
                            function createBoard() {
                                console.log("asdf")
                                const newBoard: BoardStub = { name: f, id: uuid.v4() }
                                dispatch({ action: "board.add", payload: newBoard })
                                setTimeout(() => navigateToBoard(newBoard.id), 100) // TODO: some ack based solution would be more reliable
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
    sessionState,
}: {
    dispatch: Dispatch
    navigateToBoard: (boardId: Id | undefined) => void
    sessionState: L.Property<UserSessionState>
}) => {
    const boardName = L.atom("")
    const disabled = L.view(boardName, (n) => !n)

    function createBoard(e: JSX.FormEvent) {
        e.preventDefault()
        const newBoard: BoardStub = { name: boardName.get(), id: uuid.v4() }

        const ap = accessPolicy.get()
        const ss = sessionState.get()

        if (ap && ss.status === "logged-in") {
            // Always add board creator's email to allowlist,
            // And show it as a disabled input in the allowlist form.
            newBoard.accessPolicy = { ...ap, allowList: ap.allowList.concat({ email: ss.email }) }
        }
        dispatch({ action: "board.add", payload: newBoard })
        setTimeout(() => navigateToBoard(newBoard.id), 100) // TODO: some ack based solution would be more reliable
    }

    const restrictAccessToggle = L.atom(false)
    const allowList = L.atom<({ email: string } | { domain: string })[]>([])
    const inputRef = L.atom<HTMLInputElement | null>(null)
    const currentInputText = L.atom("")

    inputRef.forEach((t) => {
        if (t) {
            // Autofocus email/domain input field for better UX
            t.focus()
        }
    })

    function addToAllowListIfValid(input: string) {
        // LMAO at this validation
        const entry = input.includes("@") ? { email: input } : input.includes(".") ? { domain: input } : null

        if (entry) {
            allowList.modify((w) => [entry, ...w])
            currentInputText.set("")
        }
    }

    const accessPolicy: L.Property<BoardAccessPolicy> = L.combine(
        sessionState,
        restrictAccessToggle,
        allowList,
        (s, r, a) => {
            return !r || s.status !== "logged-in"
                ? undefined
                : {
                      allowList: a,
                  }
        },
    )

    return (
        <form onSubmit={createBoard} className="create-board">
            <h2>Create a board</h2>
            <TextInput value={boardName} placeholder="Enter board name" />
            {L.view(
                sessionState,
                (s) =>
                    s.status === "logged-in" && (
                        <div className="restrict-toggle">
                            <input
                                id="domain-restrict"
                                type="checkbox"
                                onChange={(e) => restrictAccessToggle.set(!!e.target.checked)}
                            />
                            <label htmlFor="domain-restrict">
                                Restrict access to specific domains / email addresses
                            </label>
                        </div>
                    ),
            )}

            {L.view(
                accessPolicy,
                (a) =>
                    !!a && (
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

                            {a.allowList.map((entry) => {
                                return (
                                    <div className="input-and-button">
                                        <div className="filled-entry">
                                            {"domain" in entry
                                                ? `Allowing everyone with an email address ending in ${entry.domain}`
                                                : `Allowing single user ${entry.email}`}
                                        </div>
                                        <button onClick={() => allowList.modify((w) => w.filter((e) => e !== entry))}>
                                            Remove
                                        </button>
                                    </div>
                                )
                            })}

                            {L.view(
                                sessionState,
                                (s) =>
                                    s.status === "logged-in" && (
                                        <div className="input-and-button">
                                            <div className="filled-entry">{`Allowing single user ${s.email}`}</div>
                                            <button disabled>Remove</button>
                                        </div>
                                    ),
                            )}
                        </>
                    ),
            )}
            <button id="create-board-button" data-test="create-board-submit" type="submit" disabled={disabled}>
                Create
            </button>
        </form>
    )
}
