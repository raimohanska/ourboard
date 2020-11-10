import { h, Fragment } from "harmaja";
import * as L from "lonna";
import { BoardAppState, Dispatch } from "../board/board-store";
import { SyncStatus } from "../sync-status/sync-status-store";
import { EditableSpan } from "./components";

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
        dispatch({ action: "nickname.set", nickname, userId })
    })
    return <header>
        <h1 id="app-title" data-test="app-title">
            <a href="/">R-Board</a>
            {
                L.view(state, s => !!s.board, b => b && <>
                    <span> &gt; </span>
                    <span data-test="board-name" id="board-name">{L.view(state, s => s.board?.name)}</span>
                </>)
            }
            
        </h1> 
                    
        <EditableSpan showIcon={true} className="nickname" {...{ value: nicknameAtom, editingThis}}/>
        <span className={ L.view(syncStatus, s => "sync-status " + s) }>
            <span title={ L.view(syncStatus, showStatus) } className="symbol">⬤</span>
        </span>                  
    </header>
}