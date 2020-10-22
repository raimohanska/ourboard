import { h } from "harmaja";
import * as L from "lonna";
import { SyncStatus } from "../sync-status/sync-status-store";

export const Header = ({ syncStatus }: { syncStatus: L.Property<SyncStatus> }) => {
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
        <h1><a href="/">R-Board</a></h1> 
        <span className={ L.view(syncStatus, s => "sync-status " + s) }>
            <span title={ L.view(syncStatus, showStatus) } className="symbol">⬤</span>
        </span>                  
    </header>
}