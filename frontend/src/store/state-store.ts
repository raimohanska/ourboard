import * as L from "lonna"
import { globalScope } from "lonna"
import { AppEvent, EventUserInfo, Id, UIEvent } from "../../../common/src/domain"
import { userInfo as googleUser } from "../google-auth"
import { ServerConnection } from "./server-connection"

export type PartialState = {
    sessionId: Id | null
    nickname: string | undefined
}

export type StateStore = ReturnType<typeof stateStore>

export type Dispatch = (e: UIEvent) => void

export function stateStore(connection: ServerConnection, localStorage: Storage) {
    const { uiEvents, bufferedServerEvents, dispatch, messageQueue, events } = connection

    // TODO: there's currently no checking of boardId match - if client has multiple boards, this needs to be improved
    // TODO: get event types right, can we?
    // TODO: move the local user stuff to separate store
    const eventsReducer = (state: PartialState, event: AppEvent): PartialState => {
        if (event.action === "board.join.ack") {
            let nickname = event.nickname
            if (localStorage.nickname) { // TODO: send nickname OR login, and do that ON CONNECTION
                nickname = localStorage.nickname
                dispatch({ action: "nickname.set", nickname })
            }
            return { ...state, sessionId: event.sessionId, nickname }
        } else if (event.action === "nickname.set") {
            const nickname = storeNickName(event.nickname)
            return { ...state, nickname }
        } else {
            // Ignore other events
            return state
        }
    }

    const initialState: PartialState = {
        sessionId: null,
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

    const sessionId = L.view(state, "sessionId")
    L.merge(
        connection.connected.pipe(
            L.changes,
            L.filter((c: boolean) => c),
        ),
        userInfo.pipe(L.changes),
    ).forEach(() => {
        const user = googleUser.get()
        switch (user.status) {
            case "signed-in":
                connection.dispatch({ action: "nickname.set", nickname: user.name })
                connection.dispatch({ action: "auth.login", name: user.name, email: user.email, token: user.token })
                return
            case "signed-out":
                return connection.dispatch({ action: "auth.logout" })
        }
    })

    return {
        state,
        userInfo,
        sessionId,
    }

    function storeNickName(nickname: string) {
        localStorage.nickname = nickname
        return nickname
    }
}
