import * as L from "lonna"
import { globalScope } from "lonna"
import { addOrReplaceEvent } from "../../../common/src/action-folding"
import {
    AppEvent,
    Board,
    BoardHistoryEntry,
    EventFromServer,
    EventUserInfo,
    Id,
    ItemLocks,
    UserCursorPosition,
    UserSessionInfo,
} from "../../../common/src/domain"
import { userInfo as googleUser } from "../google-auth"
import { getInitialBoardState } from "./board-local-store"
import { boardStore } from "./board-store"
import MessageQueue from "./message-queue"

export type BoardAppState = {
    board: Board | undefined
    history: BoardHistoryEntry[]
    userId: Id | null
    nickname: string | undefined
    users: UserSessionInfo[]
    cursors: Record<Id, UserCursorPosition>
    locks: ItemLocks
}

export type StateStore = ReturnType<typeof stateStore>

export type Dispatch = (e: AppEvent) => void

const SERVER_EVENTS_BUFFERING_MILLIS = 20

export function stateStore(socket: typeof io.Socket, boardId: Id | undefined, localStorage: Storage) {
    const uiEvents = L.bus<AppEvent>()
    const dispatch: Dispatch = uiEvents.push
    const serverEvents = L.bus<EventFromServer>()
    const bufferedServerEvents = serverEvents.pipe(
        L.bufferWithTime(SERVER_EVENTS_BUFFERING_MILLIS),
        L.flatMap((events) => {
            return L.fromArray(
                events.reduce((folded, next) => addOrReplaceEvent(next, folded), [] as EventFromServer[]),
            )
        }, globalScope),
    )
    const messageQueue = MessageQueue(socket)
    const connected = L.atom(false)
    socket.on("connect", () => {
        console.log("Socket connected")
        messageQueue.onConnect()
        connected.set(true)
    })
    socket.on("disconnect", () => {
        console.log("Socket disconnected")
        connected.set(false)
    })
    socket.on("message", function (kind: string, event: EventFromServer) {
        if (kind === "app-event") {
            serverEvents.push(event)
        }
    })
    L.pipe(
        uiEvents,
        L.filter((e: AppEvent) => e.action !== "undo" && e.action !== "redo"),
    ).forEach(messageQueue.enqueue)

    // uiEvents.log("UI")
    // serverEvents.log("Server")

    const events = L.merge(uiEvents, bufferedServerEvents)

    type PartialState = {
        userId: Id | null
        nickname: string | undefined
        users: UserSessionInfo[]
    }

    // TODO: there's currently no checking of boardId match - if client has multiple boards, this needs to be improved
    // TODO: get event types right, can we?
    const eventsReducer = (state: PartialState, event: AppEvent): PartialState => {
        if (event.action === "board.join.ack") {
            let nickname = event.nickname
            if (localStorage.nickname && localStorage.nickname !== event.nickname) {
                nickname = localStorage.nickname
                dispatch({ action: "nickname.set", userId: event.userId, nickname })
            }
            return { ...state, userId: event.userId, nickname }
        } else if (event.action === "nickname.set") {
            const nickname = event.userId === state.userId ? storeNickName(event.nickname) : state.nickname
            const users = state.users.map((u) => (u.userId === event.userId ? { ...u, nickname: event.nickname } : u))
            return { ...state, users, nickname }
        } else {
            // Ignore other events
            return state
        }
    }

    const initialState: PartialState = {
        userId: null,
        nickname: undefined,
        users: []
    }
    const partialState = events.pipe(L.scan(initialState, eventsReducer, globalScope))

    const userInfo = L.view(
        googleUser,
        L.view(partialState, "nickname"),
        (g, n): EventUserInfo => {
            return g.status === "signed-in" // The user info will actually be overridden by the server!
                ? {
                      userType: "authenticated",
                      nickname: g.name,
                      name: g.name,
                      email: g.email,
                  }
                : { userType: "unidentified", nickname: n || "UNKNOWN" }
        },
    )

    const bs = boardStore(bufferedServerEvents, uiEvents, messageQueue, userInfo)

    const state: L.Property<BoardAppState> = L.combine(partialState, bs.state, (partial, boardState) => ({
        ...partial,
        ...boardState,
    }))

    function joinBoard(boardId: Id) {
        console.log("Joining board", boardId)
        dispatch({
            action: "board.join",
            boardId,
            initAtSerial: getInitialBoardState(boardId)?.boardWithHistory.board.serial,
        })
    }

    return {
        state,
        dispatch,
        connected,
        events,
        queueSize: messageQueue.queueSize,
        boardId: L.constant(boardId),
        joinBoard,
    }

    function storeNickName(nickname: string) {
        localStorage.nickname = nickname
        return nickname
    }
}
