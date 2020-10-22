import * as L from "lonna";
import { globalScope } from "lonna";
import { AppEvent, Board, CursorPosition, Id } from "../../../common/domain";
import { boardReducer } from "../../../common/state";
import MessageQueue from "./message-queue";

export type BoardAppState = {
    board: Board | undefined
    userId: Id | null
    users: Set<Id>
    cursors: Record<Id, CursorPosition>
}

export type BoardStore = {
    state: L.Property<BoardAppState>,
    dispatch: Dispatch,
    events: L.EventStream<AppEvent>,
    queueSize: L.Property<number>
}

export type Dispatch = (e: AppEvent) => void

export function boardStore(socket: typeof io.Socket): BoardStore {
    const uiEvents = L.bus<AppEvent>()
    const serverEvents = L.bus<AppEvent>()    
    const messageQueue = MessageQueue(socket)
    socket.on("connect", () => { console.log("Socket connected")})
    socket.on("message", function(kind: string, event: AppEvent) { 
        if (kind === "app-event") {
            serverEvents.push(event)
        }
    })
    uiEvents.forEach(messageQueue.enqueue)

    // uiEvents.log("UI")
    // serverEvents.log("Server")
    
    const events = L.merge(uiEvents, serverEvents)

    const eventsReducer = (state: BoardAppState, event: AppEvent) => {
        if (event.action.startsWith("item.")) {
            return { ...state, board: boardReducer(state.board!, event) }
        } else if (event.action === "board.init") {
            return { ...state, board: event.board }
        } else if (event.action === "board.join.ack") {
            return { ...state, userId: event.userId }
        } else if (event.action === "board.joined") {
            return { ...state, users: state.users.add(event.userId) }
        } else if (event.action === "cursor.positions") {
            return { ...state, cursors: event.positions }
        } else if (event.action === "cursor.move") {
            return state
        } else {
            console.warn("Unhandled event", event)
            return state
        }
    }
    
    const state = events.pipe(L.scan({ board: undefined, userId: null, users: new Set<Id>(), cursors: {} }, eventsReducer, globalScope))
    state.pipe(L.changes, L.map((s: BoardAppState) => s.board), L.debounce(500)).forEach(LocalBoardStorage.saveBoard)
    
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