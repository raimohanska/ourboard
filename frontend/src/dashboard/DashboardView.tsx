import { h, Fragment, ListView } from "harmaja"
import * as L from "lonna"
import { exampleBoard, Id } from "../../../common/src/domain"
import { generateFromTemplate, getUserTemplates } from "../board/templates"
import { TextInput } from "../components/components"
import { canLogin, Dispatch, UserSessionState } from "../store/user-session-store"

import { signIn, signOut } from "../google-auth"
import { RecentBoards } from "../store/recent-boards"

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
                R-Board
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
    const boardsToShow = L.view(recentBoards.recentboards, (bs) => bs.slice(0, 15))
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
            <h2>Welcome to R-Board!</h2>
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
        const templateName = chosenTemplate.get()
        const template = templates[templateName]
        if (!template) {
            throw Error("Template" + templateName + "not found??")
        }
        const newBoard = generateFromTemplate(boardName.get(), template)
        dispatch({ action: "board.add", payload: newBoard })
        navigateToBoard(newBoard.id)
    }

    const { templates, templateOptions, defaultTemplate } = getUserTemplates()
    const chosenTemplate = L.atom<string>(defaultTemplate.name)

    return (
        <form onSubmit={createBoard} className="create-board">
            <h2>Create a board</h2>
            <TextInput value={boardName} placeholder="Enter board name" />
            {templateOptions.length > 1 && (
                <>
                    <small>
                        <label htmlFor="template-select">Use template</label>
                    </small>
                    <select onChange={(e) => chosenTemplate.set(e.target.value)} name="templates" id="template-select">
                        {templateOptions.map((name) => (
                            <option value={name}>{name}</option>
                        ))}
                    </select>
                </>
            )}
            <button data-test="create-board-submit" type="submit" disabled={disabled}>
                Create
            </button>
        </form>
    )
}
