import * as H from "harmaja";
import * as L from "lonna";
import { h } from "harmaja";
import io from "socket.io-client";
import './app.scss';
import { BoardAppState, boardStore } from "./board/board-store";
import { BoardView } from "./board/BoardView";
import { Header } from "./components/Header";
import { syncStatusStore } from "./sync-status/sync-status-store";
import { Board, exampleBoard } from "../../common/domain";
import { DashboardView } from "./board/DashboardView"
import { assetStore } from "./board/asset-store";

const App = () => {
    const socket = io();    
    const store = boardStore(socket)    
    const assets = assetStore(socket, store)
    const syncStatus = syncStatusStore(socket, store.queueSize)
    const showingBoardId = store.state.pipe(L.map((s: BoardAppState) => s.board ? s.board.id : undefined))
    const cursors = store.state.pipe(L.map((s: BoardAppState) => {
        const otherCursors = { ...s.cursors };
        s.userId && delete otherCursors[s.userId];
        return Object.values(otherCursors);
    }))
    const nickname = L.view(store.state, s => s.nickname)

    store.boardId.forEach(boardId => {
        if (!boardId) {
            // no board in URL => do nothing
        } else {
            const currentBoard = store.state.get().board
            if (!currentBoard || currentBoard.id !== boardId) {
                console.log("Joining board", boardId)
                store.dispatch({ action: "board.join", boardId })
            }
        }
    })
    showingBoardId.forEach(boardId => {
        if (boardId && boardId !== store.boardId.get()) {
            document.location.replace("/b/" + boardId)
        }
    })

    return <div id="root">        
        <Header syncStatus={syncStatus} nickname={nickname}/>
        {
            L.view(store.boardId, boardId => 
                boardId ? L.view(showingBoardId, boardId => boardId 
                    ? <BoardView {...{
                        boardId,
                        cursors,
                        assets,
                        state: store.state,
                        dispatch: store.dispatch
                        }}/> 
                    : null
                ) : <DashboardView {...{ dispatch: store.dispatch }}/>               
            )
        }
    </div>
}

H.mount(<App/>, document.getElementById("root")!)