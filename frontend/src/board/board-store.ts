import * as B from "lonna";
import { globalScope } from "lonna";
import { AppEvent, Board } from "../../../common/domain";
import { boardReducer } from "../../../common/state";
import MessageQueue from "./message-queue";

export type BoardAppState = {
    board: Board | undefined
}

export type BoardStore = {
    state: B.Property<BoardAppState>,
    dispatch: Dispatch,
    events: B.EventStream<AppEvent>,
    queueSize: B.Property<number>
}

export type Dispatch = (e: AppEvent) => void

export function boardStore(socket: typeof io.Socket): BoardStore {
    const uiEvents = B.bus<AppEvent>()
    const serverEvents = B.bus<AppEvent>()    
    const messageQueue = MessageQueue(socket)
    socket.on("connect", () => { console.log("Socket connected")})
    socket.on("message", function(kind: string, event: AppEvent) { 
        if (kind === "app-event") {
            serverEvents.push(event)
        }
    })
    uiEvents.forEach(messageQueue.enqueue)

    uiEvents.log("UI")
    serverEvents.log("Server")
    
    const events = B.merge(uiEvents, serverEvents)

    const eventsReducer = (state: BoardAppState, event: AppEvent) => {
        if (event.action.startsWith("item.")) {
            return { ...state, board: boardReducer(state.board!, event) }
        } else if (event.action === "board.init") {
            return { ...state, board: event.board }
        } else {
            console.warn("Unhandled event", event)
            return state
        }
    }
    
    const state = events.pipe(B.scan({ board: undefined }, eventsReducer, globalScope))
    state.pipe(B.changes, B.map((s: BoardAppState) => s.board), B.debounce(500)).forEach(LocalBoardStorage.saveBoard)
    
    return {
        state,
        dispatch: uiEvents.push,
        events,    
        queueSize: messageQueue.queueSize
    }
}

const LocalBoardStorage = (() => {
    const initialBoard: Board = localStorage.board ? JSON.parse(localStorage.board) : [] // TODO: the localStorage approach is not very scalable here.

    return {
        initialBoard,
        saveBoard: (board: Board | undefined) => { if (board) { localStorage.board = JSON.stringify(board) }},
    }
})()