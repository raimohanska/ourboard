import { h } from "harmaja";
import * as B from "lonna";
import { SyncStatus } from "../sync-status/sync-status-store";

export const Header = ({ syncStatus }: { syncStatus: B.Property<SyncStatus> }) => {
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
        <h1>R-Board</h1> 
        <span className={ syncStatus.pipe(B.map(s => "sync-status " + s)) }>
            <span title={ syncStatus.pipe(B.map(showStatus)) } className="symbol">⬤</span>
        </span>                  
    </header>
}