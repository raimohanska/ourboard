import { google } from "googleapis"
import { OAuthAuthenticatedUser } from "../../common/src/authenticated-user"
import { getEnv } from "./env"
import { AuthProvider } from "./oauth"

type GoogleConfig = {
    clientID: string
    clientSecret: string
    callbackURL: string
}

export const googleConfig: GoogleConfig | null = process.env.GOOGLE_OAUTH_CLIENT_ID
    ? {
          clientID: getEnv("GOOGLE_OAUTH_CLIENT_ID"),
          clientSecret: getEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
          callbackURL: `${getEnv("ROOT_URL")}/google-callback`,
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

    async function getAccountFromCode(code: string): Promise<OAuthAuthenticatedUser> {
        const auth = googleOAUTH2()
        const data = await auth.getToken(code)
        const tokens = data.tokens

        auth.setCredentials(tokens)
        const plus = google.people({ version: "v1", auth })
        const me = await plus.people.get({
            resourceName: "people/me",
            personFields: "names,emailAddresses,photos",
        })
        const email = assertNotNull(assertNotNull(me.data.emailAddresses)[0]?.value)
        return {
            name: assertNotNull(assertNotNull(assertNotNull(me.data.names)[0]).displayName),
            email,
            picture: assertNotNull(assertNotNull(assertNotNull(me.data.photos)[0]).url),
        }
    }

    function assertNotNull<T>(x: T | null | undefined): T {
        if (x === null || x === undefined) throw Error("Assertion failed: " + x)
        return x
    }

    return {
        getAuthPageURL,
        getAccountFromCode,
    }
}
