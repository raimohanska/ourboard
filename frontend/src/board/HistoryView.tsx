import { h, Fragment, ListView } from "harmaja";
import * as L from "lonna";
import { Board, BoardHistoryEntry } from "../../../common/src/domain";
import prettyMs from "pretty-ms"
import _ from "lodash";
import { ISODate } from "./recent-boards";

export const HistoryView = ({ history, board }: { history: L.Property<BoardHistoryEntry[]>, board: L.Property<Board>}) => {
    const expanded = L.atom(false)
    return <div className={L.view(expanded, e => e ? "history expanded" : "history")}>
        <span className="icon history" onClick={() => expanded.modify(e => !e)}/>
        {
            L.view(expanded, e => e && <>
                <h2>Change Log</h2>
                <ListView observable={history} getKey={i => i.timestamp} renderObservable={ renderHistoryEntry }/>
            </>)
        }        
    </div>

    function renderHistoryEntry(key: string, entry: L.Property<BoardHistoryEntry>) {
        return <div className="row">
            <span className="timestamp">
                { L.view(entry, e => renderTimestamp(e.timestamp) ) }  
            </span>
            { L.view(entry, e => e.user.nickname) }
        </div>
    }

    function renderTimestamp(timestamp: ISODate) {
        const diff = new Date().getTime() - new Date(timestamp).getTime()
        if (diff < 1000) return "just now"
        return prettyMs(diff, {compact: true}) + " ago"
    }
}