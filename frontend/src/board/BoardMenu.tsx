import { h, Fragment } from "harmaja"
import * as L from "lonna"
import { EditableSpan } from "../components/EditableSpan"
import { BoardAppState, Dispatch } from "../store/board-store"

export const BoardMenu = ({
    boardId,
    state,
    dispatch,
}: {
    boardId: string
    state: L.Property<BoardAppState>
    dispatch: Dispatch
}) => {
    const editingAtom = L.atom(false)
    const nameAtom = L.atom(
        L.view(state, (s) => s.board?.name || ""),
        (newName) => dispatch({ action: "board.rename", boardId, name: newName }),
    )

    return L.view(
        state,
        (s) => !!s.board,
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
