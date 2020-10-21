import * as H from "harmaja";
import * as B from "lonna";
import { h } from "harmaja";
import io from "socket.io-client";
import './app.scss';
import * as L from "lonna"
import { BoardAppState, boardStore } from "./board/board-store";
import { BoardView } from "./board/BoardView";
import { Header } from "./components/Header";
import { syncStatusStore } from "./sync-status/sync-status-store";
import { Board, exampleBoard } from "../../common/domain";

const App = () => {
    const socket = io();    
    const store = boardStore(socket)    
    const syncStatus = syncStatusStore(socket, store.queueSize)
    const boardId = store.state.pipe(L.map((s: BoardAppState) => s.board ? s.board.id : undefined))
    const cursors = store.state.pipe(L.map((s: BoardAppState) => {
        const otherCursors = { ...s.cursors };
        s.userId && delete otherCursors[s.userId];
        return Object.values(otherCursors);
    }))

    if (!boardId.get()) {
        store.dispatch({ action: "board.join", boardId: exampleBoard.id })
    }

    B.fromEvent<MouseEvent>(window, "mousemove")
        .pipe(B.map(({ clientX: x, clientY: y }: MouseEvent) => ({ x, y })))
        .forEach(position => {
            const bid = boardId.get();
            if (typeof bid === "string") {
                store.dispatch({ action: "cursor.move", position, boardId: bid })
            }}
        )

    return <div id="root">        
        <Header syncStatus={syncStatus}/>
        {
            boardId.pipe(L.map((boardId: string | undefined) => boardId 
                ? <BoardView {...{
                    boardId,
                    cursors,
                    board: L.view(store.state, "board") as L.Property<Board>,
                    dispatch: store.dispatch
                    }}/> 
                : <span>No board</span>
            ))           
        }
    </div>
}

H.mount(<App/>, document.getElementById("root")!)