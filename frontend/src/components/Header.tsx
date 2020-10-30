import { h } from "harmaja";
import * as L from "lonna";
import { SyncStatus } from "../sync-status/sync-status-store";

export const Header = ({ syncStatus, nickname }: { syncStatus: L.Property<SyncStatus>, nickname: L.Property<string> }) => {
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
    return <header>
        <h1 id="app-title" data-test="app-title"><a href="/">R-Board</a></h1> 
        <span className="nickname">{nickname}</span>
        <span className={ L.view(syncStatus, s => "sync-status " + s) }>
            <span title={ L.view(syncStatus, showStatus) } className="symbol">⬤</span>
        </span>                  
    </header>
}