import { google } from "googleapis"
import { getEnv } from "./env"
import { Express } from "express"

const googleConfig = {
    clientID: getEnv("GOOGLE_OAUTH_CLIENT_ID"),
    clientSecret: getEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
    callbackURL: `${getEnv("ROOT_URL")}/google-callback`,
}
const googleScopes = ["email", "https://www.googleapis.com/auth/userinfo.profile"]

function googleOAUTH2() {
    if (!googleConfig.clientID || !googleConfig.clientSecret)
        throw new Error("Missing environment variables for Google OAuth")
    return new google.auth.OAuth2(googleConfig.clientID, googleConfig.clientSecret, googleConfig.callbackURL)
}

function googleAuthPageURL() {
    return googleOAUTH2().generateAuthUrl({
        scope: googleScopes,
    })
}

export type GoogleAuthenticatedUser = {
    name: string
    email: string
    picture: string
}

async function getGoogleAccountFromCode(code: string): Promise<GoogleAuthenticatedUser> {
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

export function setupGoogleAuth(app: Express) {
    app.get("/login", async (req, res) => {
        res.setHeader("content-type", "text/html")
        res.send(`<script>document.location='${googleAuthPageURL()}'</script>`)
    })

    app.get("/google-callback", async (req, res) => {
        const code = (req.query?.code as string) || ""

        console.log("Verifying google auth", code)
        try {
            const userInfo = await getGoogleAccountFromCode(code)
            console.log("Found", userInfo)
            res.redirect("/")
        } catch (e) {
            console.error(e)
            res.status(500).send("Internal error")
        }
    })
}