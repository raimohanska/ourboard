import { h, Fragment } from "harmaja"
import * as L from "lonna"
import { AccessLevel, Board } from "../../../../common/src/domain"
import { EditableSpan } from "../../components/EditableSpan"
import { UserInfoView } from "../../components/UserInfoView"
import { Dispatch } from "../../store/board-store"
import { UserSessionState } from "../../store/user-session-store"

export function BoardViewHeader({
    board,
    accessLevel,
    sessionState,
    dispatch,
}: {
    board: L.Property<Board>
    accessLevel: L.Property<AccessLevel>
    sessionState: L.Property<UserSessionState>
    dispatch: Dispatch
}) {
    const editingAtom = L.atom(false)
    const nameAtom = L.atom(
        L.view(board, (board) => board?.name || ""),
        (newName) => dispatch({ action: "board.rename", boardId: board.get()!.id, name: newName }),
    )

    return (
        <header>
            <span className="logo-area" />
            {L.view(
                board,
                (b) => !!b,
                (b) =>
                    b && (
                        <>
                            <span data-test="board-name" id="board-name">
                                {L.view(accessLevel, (l) =>
                                    l === "read-only" ? (
                                        <span>
                                            {nameAtom} <small>read-only</small>
                                        </span>
                                    ) : (
                                        <EditableSpan value={nameAtom} editingThis={editingAtom} />
                                    ),
                                )}
                            </span>
                        </>
                    ),
            )}
            <UserInfoView state={sessionState} dispatch={dispatch} />
        </header>
    )
}
