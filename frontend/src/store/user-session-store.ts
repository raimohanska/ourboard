import * as L from "lonna"
import { globalScope } from "lonna"
import { AppEvent, BoardAccessPolicy, EventUserInfo, Id, UIEvent } from "../../../common/src/domain"
import { GoogleAuthenticatedUser } from "../../../common/src/authenticated-user"
import { ServerConnection } from "./server-connection"

export type UserSessionState = Anonymous | LoggingInServer | LoggedIn | LoggedOut | LoginFailedDueToTechnicalProblem

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
    const eventsReducer = (state: UserSessionState, event: AppEvent | boolean): UserSessionState => {
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
                        console.log("Server denied login - redirecting to login")
                        document.location = "/login" as any
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
            return state
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
                action: "auth.login.jwt",
                jwt: getUserJWT()!,
            })
        } else if (state.nickname) {
            //console.log("Send nick")
            connection.send({ action: "nickname.set", nickname: state.nickname })
        }
        return state
    }

    const userFromCookie = getAuthenticatedUserFromCookie()

    const initialState: UserSessionState = !userFromCookie
        ? {
              status: "anonymous",
              sessionId: null,
              nickname: localStorage.nickname || undefined,
              nicknameSetByUser: !!localStorage.nickname,
              loginSupported: true,
          }
        : {
              status: "logging-in-server",
              sessionId: null,
              nickname: localStorage.nickname || undefined,
              nicknameSetByUser: !!localStorage.nickname,
              ...userFromCookie,
              retries: 0,
          }

    const sessionState = L.merge(
        connection.bufferedServerEvents,
        connection.sentUIEvents,
        connection.connected.pipe(L.changes),
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

// Get / set authenticated user stored in cookies

function getCookie(name: string) {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()!.split(";").shift()
}

function jwtDecode(t: string) {
    return {
        header: JSON.parse(window.atob(t.split(".")[0])),
        payload: JSON.parse(window.atob(t.split(".")[1])),
    }
}

function getAuthenticatedUserFromCookie(): GoogleAuthenticatedUser | null {
    const userCookie = getUserJWT()
    if (userCookie) {
        try {
            return jwtDecode(userCookie).payload as GoogleAuthenticatedUser
        } catch (e) {
            console.warn("Token parsing failed", userCookie, e)
        }
    }
    return null
}

function getUserJWT() {
    return getCookie("user") ?? null
}

export function canLogin(state: UserSessionState): boolean {
    if (state.status === "logged-out" || state.status === "login-failed") return true
    if (state.status === "anonymous" && state.loginSupported) return true
    return false
}

export function isLoginInProgress(state: StateId): boolean {
    return state === "logging-in-server"
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
