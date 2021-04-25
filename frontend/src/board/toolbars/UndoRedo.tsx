import { h } from "harmaja"
import { RedoIcon, UndoIcon } from "../../components/Icons"
import { BoardStore, Dispatch } from "../../store/board-store"

export function UndoRedo({ dispatch, boardStore }: { dispatch: Dispatch; boardStore: BoardStore }) {
    return (
        <div className="undo-redo">
            <span className="icon" title="Undo" onClick={() => dispatch({ action: "ui.undo" })}>
                <UndoIcon enabled={boardStore.canUndo} />
            </span>
            <span className="icon" title="Redo" onClick={() => dispatch({ action: "ui.redo" })}>
                <RedoIcon enabled={boardStore.canRedo} />
            </span>
        </div>
    )
}
