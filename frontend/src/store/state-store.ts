import * as L from "lonna"
import { globalScope } from "lonna"
import {
    AppEvent,
    Board,
    BoardHistoryEntry,
    EventUserInfo,
    Id,
    ItemLocks,
    UIEvent,
    UserCursorPosition,
    UserSessionInfo,
} from "../../../common/src/domain"
import { userInfo as googleUser } from "../google-auth"
import { getInitialBoardState } from "./board-local-store"
import { ServerConnection } from "./server-connection"

export type PartialState = {
    userId: Id | null
    nickname: string | undefined
}

export type StateStore = ReturnType<typeof stateStore>

export type Dispatch = (e: UIEvent) => void

export function stateStore(connection: ServerConnection, boardId: Id | undefined, localStorage: Storage) {
    const { uiEvents, bufferedServerEvents, dispatch, messageQueue } = connection
    const events = L.merge(uiEvents, bufferedServerEvents)


    // TODO: there's currently no checking of boardId match - if client has multiple boards, this needs to be improved
    // TODO: get event types right, can we?
    // TODO: move the local user stuff to separate store
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
            return { ...state, nickname }
        } else {
            // Ignore other events
            return state
        }
    }

    const initialState: PartialState = {
        userId: null,
        nickname: undefined,
    }
    const state = events.pipe(L.scan(initialState, eventsReducer, globalScope))

    const userInfo = L.view(
        googleUser,
        L.view(state, "nickname"),
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
        events,
        boardId: L.constant(boardId),
        joinBoard,
        userInfo,
        userId: L.view(state, "userId")
    }

    function storeNickName(nickname: string) {
        localStorage.nickname = nickname
        return nickname
    }
}
