import { h, Fragment } from "harmaja";
import * as L from "lonna";
import { SyncStatus } from "../store/sync-status-store";

export const SyncStatusView = ({ syncStatus }: { syncStatus: L.Property<SyncStatus> }) => {
    return <span className={ L.view(syncStatus, s => "sync-status " + s) }/>
}