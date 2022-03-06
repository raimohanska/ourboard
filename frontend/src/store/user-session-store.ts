import * as L from "lonna"
import { globalScope } from "lonna"
import { AppEvent, BoardAccessPolicy, EventUserInfo, Id, UIEvent } from "../../../common/src/domain"
import { GoogleAuthenticatedUser, GoogleAuthUserInfo, googleUser, signIn, refreshUserInfo } from "../google-auth"
import { ServerConnection } from "./server-connection"

export type UserSessionState =
    | Anonymous
    | LoggingInLocal
    | LoggingInServer
    | LoggedIn
    | LoggedOut
    | LoginFailedDueToTechnicalProblem

export type StateId = UserSessionState["status"]

export type BaseSessionState = {
    sessionId: Id | null
    nickname: string | undefined
    nicknameSetByUser: boolean
}

export type Anonymous = BaseSessionState & {
    status: "anonymous"
    loginSupported: boolean
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
        userId: string
    }

export type UserSessionStore = ReturnType<typeof UserSessionStore>

export function UserSessionStore(connection: ServerConnection, localStorage: Storage) {
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
                return { ...state, nickname, nicknameSetByUser: true }
            } else if (event.action === "auth.login.response") {
                if (!event.success) {
                    const retries = getRetries(state)
                    if (retries >= 2) {
                        console.error("Login validation failed after retries, giving up.")
                        return {
                            status: "login-failed",
                            nickname: state.nickname,
                            nicknameSetByUser: state.nicknameSetByUser,
                            sessionId: state.sessionId,
                        }
                    } else {
                        console.log("Server denied login - refreshing token...")
                        refreshUserInfo()
                    }
                } else if (state.status === "logging-in-server") {
                    console.log("Successfully logged in")
                    return { ...state, status: "logged-in", userId: event.userId }
                } else {
                    console.warn(`Login response in unexpected state ${state.status}`)
                }
                return state
            } else {
                // Ignore other events
                return state
            }
        } else {
            if (event.status === "not-supported") {
                return {
                    status: "anonymous",
                    nickname: state.nickname,
                    nicknameSetByUser: state.nicknameSetByUser,
                    sessionId: state.sessionId,
                    loginSupported: false,
                }
            } else if (event.status === "signed-out") {
                if (state.status === "logging-in-server" || state.status == "logged-in") {
                    console.log("Send logout")
                    connection.send({ action: "auth.logout" })
                }

                return {
                    status: "logged-out",
                    sessionId: state.sessionId,
                    nickname: state.nickname,
                    nicknameSetByUser: state.nicknameSetByUser,
                }
            } else if (event.status === "in-progress") {
                return {
                    status: "logging-in-local",
                    sessionId: state.sessionId,
                    nickname: state.nickname,
                    nicknameSetByUser: state.nicknameSetByUser,
                }
            } else if (event.status === "signed-in") {
                const { status, ...googleUser } = event
                const newStatus = {
                    status: "logging-in-server",
                    sessionId: state.sessionId,
                    nickname: googleUser.name,
                    nicknameSetByUser: true,
                    ...googleUser,
                    retries: getRetries(state) + 1,
                } as const
                if (connection.connected.get()) {
                    sendLoginAndNickname(newStatus)
                }
                return newStatus
            } else {
                throw Error("Unknown status " + JSON.stringify(event))
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
            //console.log("Send nick & login")
            connection.send({ action: "nickname.set", nickname: state.name })
            connection.send({
                action: "auth.login",
                name: state.name,
                email: state.email,
                picture: state.picture,
                token: state.token,
            })
        } else if (state.nickname) {
            //console.log("Send nick")
            connection.send({ action: "nickname.set", nickname: state.nickname })
        }
        return state
    }

    const initialState: UserSessionState =
        googleUser.get().status === "not-supported"
            ? {
                  status: "anonymous",
                  sessionId: null,
                  nickname: localStorage.nickname || undefined,
                  nicknameSetByUser: !!localStorage.nickname,
                  loginSupported: false,
              }
            : {
                  status: "logging-in-local",
                  sessionId: null,
                  nickname: localStorage.nickname || undefined,
                  nicknameSetByUser: !!localStorage.nickname,
              }

    const sessionState = L.merge(
        connection.bufferedServerEvents,
        connection.sentUIEvents,
        connection.connected.pipe(L.changes),
        googleUser.pipe(L.changes),
    ).pipe(L.scan(initialState, eventsReducer, globalScope))

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

export function canLogin(state: UserSessionState): boolean {
    if (state.status === "logged-out" || state.status === "login-failed") return true
    if (state.status === "anonymous" && state.loginSupported) return true
    return false
}

export function isLoginInProgress(state: StateId): boolean {
    return state === "logging-in-local" || state === "logging-in-server"
}

export function getAuthenticatedUser(state: UserSessionState): GoogleAuthenticatedUser | null {
    if (state.status === "logged-in" || state.status === "logging-in-server") {
        return state
    } else {
        return null
    }
}

export function defaultAccessPolicy(sessionState: UserSessionState, restrictAccess: boolean): BoardAccessPolicy {
    if (sessionState.status === "logged-in") {
        return {
            allowList: [{ email: sessionState.email, access: "admin" }],
            publicRead: !restrictAccess,
            publicWrite: !restrictAccess,
        }
    } else {
        return undefined
    }
}
