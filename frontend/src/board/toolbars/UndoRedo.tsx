import { Fragment, h } from "harmaja"
import { Dispatch } from "../../store/server-connection"

export function UndoRedo({ dispatch }: { dispatch: Dispatch }) {
    return (
        <div className="undo-redo">
            <span className="icon undo" title="Undo" onClick={() => dispatch({ action: "ui.undo" })} />
            <span className="icon redo" title="Redo" onClick={() => dispatch({ action: "ui.redo" })} />
        </div>
    )
}
