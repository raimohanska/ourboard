import * as L from "lonna"
import { globalScope } from "lonna"
import { AppEvent, EventUserInfo, Id, UIEvent } from "../../../common/src/domain"
import { userInfo as googleUser } from "../google-auth"
import { ServerConnection } from "./server-connection"

export type UserSessionState = {
    sessionId: Id | null
    nickname: string | undefined
}

export type UserSessionStore = ReturnType<typeof userSessionStore>

export type Dispatch = (e: UIEvent) => void

export function userSessionStore(connection: ServerConnection, localStorage: Storage) {
    const { events } = connection

    const eventsReducer = (state: UserSessionState, event: AppEvent): UserSessionState => {
        if (event.action === "board.join.ack") {
            return { ...state, sessionId: event.sessionId, nickname: state.nickname || event.nickname }
        } else if (event.action === "nickname.set") {
            const nickname = storeNickName(event.nickname)
            return { ...state, nickname }
        } else {
            // Ignore other events
            return state
        }
    }

    const initialState: UserSessionState = {
        sessionId: null,
        nickname: localStorage.nickname || undefined,
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
                : { userType: "unidentified", nickname: n || "" }
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
        const gu = googleUser.get()
        switch (gu.status) {
            case "signed-in":
                connection.dispatch({ action: "nickname.set", nickname: gu.name })
                connection.dispatch({ action: "auth.login", name: gu.name, email: gu.email, token: gu.token })
                return
            case "signed-out":
                const u = userInfo.get()
                connection.dispatch({ action: "nickname.set", nickname: u.nickname })
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
