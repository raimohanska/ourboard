import { h, Fragment, ListView } from "harmaja"
import * as L from "lonna"
import { exampleBoard } from "../../../common/src/domain"
import { generateFromTemplate, getUserTemplates } from "../board/templates"
import { TextInput } from "../components/components"
import { BoardAppState, Dispatch } from "../store/state-store"
import { getRecentBoards, removeRecentBoard } from "../store/recent-boards"

import { signIn, signOut, userInfo } from "../google-auth"

export const DashboardView = ({ state, dispatch }: { state: L.Property<BoardAppState>; dispatch: Dispatch }) => {
    return (
        <div id="root" className="dashboard">
            <h1 id="app-title" data-test="app-title">
                R-Board
            </h1>
            <p>
                Free and <a href="https://github.com/raimohanska/r-board">open-source</a> online whiteboard.
            </p>
            <RecentBoards />
            <CreateBoard dispatch={dispatch} />
            <GoogleLoginArea />
        </div>
    )
}

const GoogleLoginArea = () => {
    return (
        <div className="user-auth">
            {L.view(userInfo, (user) => {
                switch (user.status) {
                    case "signed-in":
                        return (
                            <span>
                                You're signed in as {user.name} <button onClick={signOut}>Sign out</button>
                            </span>
                        )
                    case "in-progress":
                        return ""
                    case "signed-out":
                        return <button onClick={signIn}>Sign in</button>
                    case "not-supported":
                        return null
                }
            })}
        </div>
    )
}

const RecentBoards = () => {
    const recentBoardsAtom = L.view(getRecentBoards(), (bs) => bs.slice(0, 10))
    return L.view(
        recentBoardsAtom,
        (recent) => recent.length === 0,
        (empty) =>
            empty ? (
                <Welcome />
            ) : (
                <div className="recent-boards">
                    <h2>Recent boards</h2>
                    <ul>
                        <ListView
                            observable={recentBoardsAtom}
                            renderItem={(b) => (
                                <li>
                                    <a href={`/b/${b.id}`}>{b.name}</a>
                                    <a className="remove" onClick={() => removeRecentBoard(b)}>
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
const CreateBoard = ({ dispatch }: { dispatch: Dispatch }) => {
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
