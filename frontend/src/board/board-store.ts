import * as L from "lonna";
import { globalScope } from "lonna";
import { AppEvent, Board, CursorPosition, CURSOR_POSITIONS_ACTION_TYPE, Id, UserCursorPosition, UserSessionInfo } from "../../../common/domain";
import { boardReducer } from "../../../common/state";
import MessageQueue from "./message-queue";

export type BoardAppState = {
    board: Board | undefined
    userId: Id | null
    nickname: string,
    users: UserSessionInfo[]
    cursors: Record<Id, UserCursorPosition>
}

export type BoardStore = ReturnType<typeof boardStore>

export type Dispatch = (e: AppEvent) => void

export function boardStore(socket: typeof io.Socket) {
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
            return { ...state, userId: event.userId, nickname: event.nickname }
        } else if (event.action === "board.joined") {
            return { ...state, users: state.users.concat({ userId: event.userId, nickname: event.nickname }) }
        } else if (event.action === CURSOR_POSITIONS_ACTION_TYPE) {
            return { ...state, cursors: event.p }
        } else if (event.action === "cursor.move") {
            return state
        } else {
            console.warn("Unhandled event", event)
            return state
        }
    }
    
    const state = events.pipe(L.scan({ board: undefined, userId: null, nickname: "", users: [], cursors: {} }, eventsReducer, globalScope))
    
    return {
        state,
        dispatch: uiEvents.push,
        events,    
        queueSize: messageQueue.queueSize,
        boardId: L.constant(boardIdFromPath())
    }
}

function boardIdFromPath() {
    const match = document.location.pathname.match(/b\/(.*)/)
    return (match && match[1]) || undefined
}