import Cookies from "cookies"
import { IncomingMessage, ServerResponse } from "http"
import JWT from "jsonwebtoken"
import { getEnv } from "./env"
import { GoogleAuthenticatedUser } from "../../common/src/authenticated-user"

const secret = getEnv("SESSION_SIGNING_SECRET")

// Get / set authenticated user stored in cookies
export function getAuthenticatedUser(req: IncomingMessage): GoogleAuthenticatedUser | null {
    const userCookie = new Cookies(req, null as any).get("user")
    if (userCookie) {
        return getAuthenticatedUserFromJWT(userCookie)
    }
    return null
}

export function getAuthenticatedUserFromJWT(jwt: string): GoogleAuthenticatedUser | null {
    try {
        JWT.verify(jwt, secret)
        return JWT.decode(jwt) as GoogleAuthenticatedUser
    } catch (e) {
        console.warn("Token verification failed", jwt, e)
    }
    return null
}

export function setAuthenticatedUser(req: IncomingMessage, res: ServerResponse, userInfo: GoogleAuthenticatedUser) {
    const jwt = JWT.sign(userInfo, secret)
    new Cookies(req, res).set("user", jwt, {
        maxAge: 24 * 3600 * 1000,
        httpOnly: false,
    }) // Max 24 hours
}

export function removeAuthenticatedUser(req: IncomingMessage, res: ServerResponse) {
    new Cookies(req, res).set("user", "", { maxAge: 0, httpOnly: true }) // Max 24 hours
}
