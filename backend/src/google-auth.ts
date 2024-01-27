import { google } from "googleapis"
import { OAuthAuthenticatedUser } from "../../common/src/authenticated-user"
import { assertNotNull } from "../../common/src/assertNotNull"
import { getEnv } from "./env"
import { AuthProvider } from "./oauth"
import { ROOT_URL } from "./host-config"
import { decodeOrThrow } from "./decodeOrThrow"
import * as T from "io-ts"
import { optional } from "../../common/src/domain"
import JWT from "jsonwebtoken"

type GoogleConfig = {
    clientID: string
    clientSecret: string
    callbackURL: string
}

export const googleConfig: GoogleConfig | null = process.env.GOOGLE_OAUTH_CLIENT_ID
    ? {
          clientID: getEnv("GOOGLE_OAUTH_CLIENT_ID"),
          clientSecret: getEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
          callbackURL: `${ROOT_URL}/google-callback`,
      }
    : null

export const GoogleAuthProvider = (googleConfig: GoogleConfig): AuthProvider => {
    console.log(`Setting up Google authentication using client ID ${googleConfig.clientID}`)

    const googleScopes = ["email", "https://www.googleapis.com/auth/userinfo.profile"]

    function googleOAUTH2() {
        if (!googleConfig.clientID || !googleConfig.clientSecret)
            throw new Error("Missing environment variables for Google OAuth")
        return new google.auth.OAuth2(googleConfig.clientID, googleConfig.clientSecret, googleConfig.callbackURL)
    }

    async function getAuthPageURL() {
        return googleOAUTH2().generateAuthUrl({
            scope: googleScopes,
            prompt: "select_account",
        })
    }

    const IdToken = T.strict({
        hd: optional(T.string),
        email: T.string,
        email_verified: T.boolean,
        name: T.string,
        picture: T.string,
    })

    async function getAccountFromCode(code: string): Promise<OAuthAuthenticatedUser> {
        const auth = googleOAUTH2()
        const data = await auth.getToken(code)
        const idToken = decodeOrThrow(IdToken, JWT.decode(assertNotNull(data.tokens.id_token)))
        const email = idToken.email

        return {
            name: idToken.name,
            email,
            picture: idToken.picture,
            domain: idToken.hd ?? null,
        }
    }

    return {
        getAuthPageURL,
        getAccountFromCode,
    }
}
