import Cookies from "cookies"
import { IncomingMessage, ServerResponse } from "http"
import JWT from "jsonwebtoken"
import { getEnv } from "./env"
import { OAuthAuthenticatedUser } from "../../common/src/authenticated-user"
import { ISOTimeStamp, newISOTimeStamp } from "../../common/src/domain"

const secret = getEnv("SESSION_SIGNING_SECRET")

export type LoginInfo = OAuthAuthenticatedUser & {
    timestamp: ISOTimeStamp | undefined
}

export function getSessionIdFromCookies(req: IncomingMessage): string | null {
    return new Cookies(req, null as any).get("sessionId") ?? null
}

// Get / set authenticated user stored in cookies
export function getAuthenticatedUser(req: IncomingMessage): LoginInfo | null {
    const userCookie = new Cookies(req, null as any).get("user")
    if (userCookie) {
        return getAuthenticatedUserFromJWT(userCookie)
    }
    return null
}

export function getAuthenticatedUserFromJWT(jwt: string): LoginInfo | null {
    try {
        JWT.verify(jwt, secret)
        const loginInfo = JWT.decode(jwt) as LoginInfo
        if (loginInfo.domain === undefined) {
            console.log("Rejecting legacy token without domain")
            return null
        }
        return loginInfo
    } catch (e) {
        console.warn("Token verification failed", jwt, e)
    }
    return null
}

export function setAuthenticatedUser(req: IncomingMessage, res: ServerResponse, userInfo: OAuthAuthenticatedUser) {
    const loginInfo: LoginInfo = { ...userInfo, timestamp: newISOTimeStamp() }
    const jwt = JWT.sign(loginInfo, secret)
    new Cookies(req, res).set("user", jwt, {
        maxAge: 365 * 24 * 3600 * 1000,
        httpOnly: false,
    }) // Max 365 days expiration
}

export function removeAuthenticatedUser(req: IncomingMessage, res: ServerResponse) {
    new Cookies(req, res).set("user", "", { maxAge: 0, httpOnly: true })
}
