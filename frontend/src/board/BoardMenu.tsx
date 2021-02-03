import { h, Fragment } from "harmaja";
import * as L from "lonna";
import { EditableSpan } from "../components/EditableSpan";
import { BoardAppState, Dispatch } from "../store/board-store";
import { SaveAsTemplate } from "./SaveAsTemplate";

export const BoardMenu = ({ boardId, state, dispatch }: { boardId: string, state: L.Property<BoardAppState>, dispatch: Dispatch }) => {
    const showMenu = L.atom(false)
    const menuToggle = (e: JSX.MouseEvent) => {
        if (e.target === e.currentTarget) {
            showMenu.modify(s => !s)
        }
    }
    const editingAtom = L.atom(false)
    const nameAtom = L.atom(L.view(state, s => s.board?.name || ""), newName => dispatch({ action: "board.rename", boardId, name: newName }))
    
    return L.view(state, s => !!s.board, b => b && <>
    
            <span data-test="board-name" id="board-name"><EditableSpan value={nameAtom} editingThis={editingAtom} /></span>
            <span className="icon menu" onClick={menuToggle}>
                { L.view(showMenu, s => s &&
                <div className="menu">
                    <ul>
                        <li>Rename</li>
                        <SaveAsTemplate board={ L.view(state, "board")}/>
                    </ul>
                </div>
                )}
            </span>
        </>)
}