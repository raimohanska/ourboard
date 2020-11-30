import { h, Fragment } from "harmaja";
import * as L from "lonna";
import { BoardAppState, Dispatch } from "../board/board-store";
import { SyncStatus } from "../sync-status/sync-status-store";
import { UserInfoView } from "./UserInfoView";
import { BoardMenu } from "../board/BoardMenu";
import { SyncStatusView } from "./SyncStatusView";

export const Header = ({ syncStatus, state, dispatch }: { syncStatus: L.Property<SyncStatus>, state: L.Property<BoardAppState>, dispatch: Dispatch }) => {
    return <header>
        <h1 id="app-title" data-test="app-title">
            <a href="/">R-Board</a>
            <BoardMenu state={state} dispatch={dispatch}/>            
        </h1>

        <UserInfoView state={state} dispatch={dispatch} />
        <SyncStatusView syncStatus={syncStatus}/>
    </header>
}