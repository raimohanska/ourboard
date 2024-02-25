import { Fragment, h } from "harmaja"
import * as L from "lonna"
import { Checkbox } from "./components"

type BoardCrdtModeSelectorProps = {
    useCollaborativeEditing: L.Atom<boolean>
}
export const BoardCrdtModeSelector = ({ useCollaborativeEditing }: BoardCrdtModeSelectorProps) => {
    return (
        <div className="board-access-editor">
            <div className="restrict-toggle">
                <Checkbox checked={useCollaborativeEditing} />
                <span>
                    <label htmlFor="domain-restrict">Experimental: use collaborative text editor</label>
                </span>
            </div>
        </div>
    )
}
