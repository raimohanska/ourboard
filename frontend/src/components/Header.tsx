import { h, Fragment } from "harmaja";
import * as L from "lonna";
import { BoardAppState, Dispatch } from "../board/board-store";
import { SyncStatus } from "../sync-status/sync-status-store";
import { EditableSpan } from "./EditableSpan";
import { SaveAsTemplate } from "../board/SaveAsTemplate";

export const Header = ({ syncStatus, state, dispatch }: { syncStatus: L.Property<SyncStatus>, state: L.Property<BoardAppState>, dispatch: Dispatch }) => {
    const logout = () => {
        localStorage.clear();
        document.location.reload()
    }
    function showStatus(status: SyncStatus): string {
        switch (status) {
            case "offline": return "Offline"
            case "up-to-date": return "Up to date"
            case "sync-pending": return "Unsaved changes"
        }
    }
    const editingThis = L.atom(false)
    const nicknameAtom = L.atom(L.view(state, "nickname"), nickname => {
        const userId = state.get().userId
        if (!userId) throw Error("User id missing")
        if (nickname === undefined) throw Error("Cannot set nickname to undefined")
        dispatch({ action: "nickname.set", nickname, userId })
    })
    return <header>
        <h1 id="app-title" data-test="app-title">
            <a href="/">R-Board</a>
            <BoardMenu state={state} dispatch={dispatch}/>
            
        </h1> 
        { L.view(nicknameAtom, n => n !== undefined, n => n && <EditableSpan showIcon={true} className="nickname" {...{ value: nicknameAtom as L.Atom<string>, editingThis}}/>) }        
        <span className={ L.view(syncStatus, s => "sync-status " + s) }/>
    </header>
}

const BoardMenu = ({ state, dispatch }: { state: L.Property<BoardAppState>, dispatch: Dispatch }) => {
    const showMenu = L.atom(false)
    const menuToggle = (e: JSX.MouseEvent) => {
        if (e.target === e.currentTarget) {
            showMenu.modify(s => !s)
        }
    }
    return L.view(state, s => !!s.board, b => b && <>
            <span> &gt; </span>
            <span data-test="board-name" id="board-name">{L.view(state, s => s.board?.name)}</span>
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