import { h, Fragment } from "harmaja"
import * as L from "lonna"
import { Board } from "../../../../common/src/domain"
import { EditableSpan } from "../../components/EditableSpan"
import { UserInfoView } from "../../components/UserInfoView"
import { Dispatch } from "../../store/board-store"
import { UserSessionState } from "../../store/user-session-store"

export function BoardViewHeader({
    board,
    sessionState,
    dispatch,
}: {
    board: L.Property<Board>
    sessionState: L.Property<UserSessionState>
    dispatch: Dispatch
}) {
    return (
        <header>
            <span className="logo-area" />
            <BoardMenu {...{ board, dispatch }} />
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
