import * as L from "lonna"
import { globalScope } from "lonna"
import { AppEvent, EventUserInfo, Id, UIEvent } from "../../../common/src/domain"
import { GoogleAuthenticatedUser, GoogleAuthUserInfo, googleUser, signIn, refreshUserInfo } from "../google-auth"
import { ServerConnection } from "./server-connection"

export type UserSessionState =
    | Anonymous
    | LoggingInLocal
    | LoggingInServer
    | LoggedIn
    | LoggedOut
    | LoginFailedDueToTechnicalProblem

export type BaseSessionState = {
    sessionId: Id | null
    nickname: string | undefined
}

export type Anonymous = BaseSessionState & {
    status: "anonymous"
}

export type LoggedOut = BaseSessionState & {
    status: "logged-out"
}

export type LoginFailedDueToTechnicalProblem = BaseSessionState & {
    status: "login-failed"
}

/**
 *  Local OAUTH status pending
 **/
export type LoggingInLocal = BaseSessionState & {
    status: "logging-in-local"
}

/**
 *  Locally OAUTH authenticated but auth with server pending
 **/
export type LoggingInServer = BaseSessionState &
    GoogleAuthenticatedUser & {
        status: "logging-in-server"
        nickname: string
        retries: number
    }

export type LoggedIn = BaseSessionState &
    GoogleAuthenticatedUser & {
        status: "logged-in"
        nickname: string
    }

export type UserSessionStore = ReturnType<typeof userSessionStore>

export type Dispatch = (e: UIEvent) => void

export function userSessionStore(connection: ServerConnection, localStorage: Storage) {
    const { events } = connection

    const eventsReducer = (
        state: UserSessionState,
        event: AppEvent | GoogleAuthUserInfo | boolean,
    ): UserSessionState => {
        if (typeof event === "boolean") {
            // Connected = true, Disconnected = false
            const newState =
                state.status === "logged-in"
                    ? { ...state, status: "logging-in-server" as const, retries: getRetries(state) + 1 }
                    : state
            if (event === true) {
                sendLoginAndNickname(newState)
            }
            return newState
        } else if ("action" in event) {
            if (event.action === "board.join.ack") {
                return { ...state, sessionId: event.sessionId, nickname: state.nickname || event.nickname }
            } else if (event.action === "nickname.set") {
                const nickname = storeNickName(event.nickname)
                return { ...state, nickname }
            } else if (event.action === "auth.login.response") {
                if (!event.success) {
                    const retries = getRetries(state)
                    if (retries >= 2) {
                        console.error("Login validation failed after retries, giving up.")
                        return { status: "login-failed", nickname: state.nickname, sessionId: state.sessionId }
                    } else {
                        console.log("Server denied login - refreshing token...")
                        refreshUserInfo()
                    }
                } else if (state.status === "logging-in-server") {
                    console.log("Successfully logged in")
                    return { ...state, status: "logged-in" }
                } else {
                    console.warn(`Login response in unexpected state ${state.status}`)
                }
                return state
            } else {
                // Ignore other events
                return state
            }
        } else {
            if (event.status === "signed-out" || event.status === "not-supported") {
                if (state.status === "logging-in-server" || state.status == "logged-in") {
                    connection.messageQueue.enqueue({ action: "auth.logout" })
                }

                return {
                    status: "logged-out",
                    sessionId: state.sessionId,
                    nickname: state.nickname,
                }
            } else if (event.status === "in-progress") {
                return {
                    status: "logging-in-local",
                    sessionId: state.sessionId,
                    nickname: state.nickname,
                }
            } else {
                const { status, ...googleUser } = event
                return sendLoginAndNickname({
                    status: "logging-in-server",
                    sessionId: state.sessionId,
                    nickname: googleUser.name,
                    ...googleUser,
                    retries: getRetries(state) + 1,
                })
            }
        }
    }

    function getRetries(state: UserSessionState): number {
        if (state.status === "logging-in-server") {
            return state.retries
        }
        return 0
    }

    function sendLoginAndNickname(state: UserSessionState) {
        if (state.status === "logging-in-server" || state.status === "logged-in") {
            connection.messageQueue.enqueue({ action: "nickname.set", nickname: state.name })
            connection.messageQueue.enqueue({
                action: "auth.login",
                name: state.name,
                email: state.email,
                token: state.token,
            })
        } else if (state.nickname) {
            connection.messageQueue.enqueue({ action: "nickname.set", nickname: state.nickname })
        }
        return state
    }

    const initialState: UserSessionState = {
        status: googleUser.get().status === "in-progress" ? "logging-in-local" : "anonymous",
        sessionId: null,
        nickname: localStorage.nickname || undefined,
    }
    const sessionState = L.merge(events, connection.connected.pipe(L.changes), googleUser.pipe(L.changes)).pipe(
        L.scan(initialState, eventsReducer, globalScope),
    )

    L.view(sessionState, "status").log("Session status")

    // TODO: separate sessionId from board join (include in server hello)
    const sessionId = L.view(sessionState, "sessionId")

    return {
        sessionState,
        sessionId,
    }

    function storeNickName(nickname: string) {
        localStorage.nickname = nickname
        return nickname
    }
}
