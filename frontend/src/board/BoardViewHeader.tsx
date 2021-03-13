import { h, Fragment } from "harmaja"
import * as L from "lonna"
import { Board, Id, Item, Note } from "../../../common/src/domain"
import { EditableSpan } from "../components/EditableSpan"
import { UserInfoView } from "../components/UserInfoView"
import { Dispatch } from "../store/server-connection"
import { UserSessionState } from "../store/user-session-store"
import { ControlSettings } from "./BoardView"
import { PaletteView } from "./PaletteView"

export function BoardViewHeader({
    controlSettings,
    board,
    sessionState,
    dispatch,
    navigateToBoard,
    zoom,
    latestNote,
    onAdd,
}: {
    board: L.Property<Board>
    sessionState: L.Property<UserSessionState>
    controlSettings: L.Atom<ControlSettings>
    dispatch: Dispatch
    navigateToBoard: (boardId: Id | undefined) => void
    zoom: L.Atom<number>
    latestNote: L.Property<Note>
    onAdd: (item: Item) => void
}) {
    return (
        <header>
            <a
                href="/"
                onClick={(e) => {
                    navigateToBoard(undefined)
                    e.preventDefault()
                }}
            >
                <span className="icon back" />
            </a>
            <BoardMenu {...{ board, dispatch }} />

            <div className="controls">
                <span className="icon zoom_in" title="Zoom in" onClick={() => zoom.modify((z) => z * 1.1)}></span>
                <span className="icon zoom_out" title="Zoom out" onClick={() => zoom.modify((z) => z / 1.1)}></span>
                <PaletteView {...{ latestNote, onAdd, board, dispatch }} />
                <span className="icon undo" title="Undo" onClick={() => dispatch({ action: "ui.undo" })} />
                <span className="icon redo" title="Redo" onClick={() => dispatch({ action: "ui.redo" })} />
                <span
                    className={L.view(controlSettings, (s) =>
                        s.tool === "select" ? "icon cursor-arrow active" : "icon cursor-arrow",
                    )}
                    title="Select tool"
                    onClick={() => controlSettings.set({ tool: "select", hasUserManuallySetTool: true })}
                />
                <span
                    className={L.view(controlSettings, (s) => (s.tool === "pan" ? "icon pan active" : "icon pan"))}
                    title="Pan tool"
                    onClick={() => controlSettings.set({ tool: "pan", hasUserManuallySetTool: true })}
                />
                <span
                    className={L.view(controlSettings, (s) =>
                        s.tool === "connect" ? "icon connection active" : "icon connection",
                    )}
                    title="Connect tool"
                    onClick={() => controlSettings.set({ tool: "connect", hasUserManuallySetTool: true })}
                />
            </div>

            <UserInfoView state={sessionState} dispatch={dispatch} />
        </header>
    )
}

export const BoardMenu = ({ board, dispatch }: { board: L.Property<Board>; dispatch: Dispatch }) => {
    const editingAtom = L.atom(false)
    const nameAtom = L.atom(
        L.view(board, (board) => board?.name || ""),
        (newName) => dispatch({ action: "board.rename", boardId: board.get()!.id, name: newName }),
    )

    return L.view(
        board,
        (b) => !!b,
        (b) =>
            b && (
                <>
                    <span data-test="board-name" id="board-name">
                        <EditableSpan value={nameAtom} editingThis={editingAtom} />
                    </span>
                </>
            ),
    )
}
