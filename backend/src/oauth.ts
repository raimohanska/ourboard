import Cookies from "cookies"
import { Express, Request, Response } from "express"
import { OAuthAuthenticatedUser } from "../../common/src/authenticated-user"
import { removeAuthenticatedUser, setAuthenticatedUser } from "./http-session"
import { GoogleAuthProvider, googleConfig } from "./google-auth"
import { GenericOIDCAuthProvider, genericOIDCConfig } from "./generic-oidc-auth"

export interface AuthProvider {
    getAuthPageURL: () => Promise<string>
    getAccountFromCode: (code: string) => Promise<OAuthAuthenticatedUser>
    logout?: (req: Request, res: Response) => Promise<void>
}

export function setupAuth(app: Express, provider: AuthProvider) {
    app.get("/login", async (req, res) => {
        new Cookies(req, res).set("returnTo", parseReturnPath(req), {
            maxAge: 24 * 3600 * 1000,
            httpOnly: true,
        }) // Max 24 hours
        const authUrl = await provider.getAuthPageURL()
        res.setHeader("content-type", "text/html")
        res.send(`Signing in...<script>document.location='${authUrl}'</script>`)
    })

    app.get("/logout", async (req, res) => {
        removeAuthenticatedUser(req, res)
        if (provider.logout) {
            await provider.logout(req, res)
        } else {
            res.redirect(parseReturnPath(req))
        }
    })

    app.get("/google-callback", async (req, res) => {
        const code = (req.query?.code as string) || ""
        const cookies = new Cookies(req, res)
        const returnTo = cookies.get("returnTo") || "/"
        cookies.set("returnTo", "", { maxAge: 0, httpOnly: true })
        console.log("Verifying google auth", code)
        try {
            const userInfo = await provider.getAccountFromCode(code)
            console.log("Found", userInfo)
            setAuthenticatedUser(req, res, userInfo)
            res.redirect(returnTo)
        } catch (e) {
            console.error(e)
            res.status(500).send("Internal error")
        }
    })

    app.get("/test-callback", async (req, res) => {
        const cookies = new Cookies(req, res)
        const returnTo = cookies.get("returnTo") || "/"
        setAuthenticatedUser(req, res, { domain: null, email: "ourboardtester@test.com", name: "Ourboard tester" })
        res.redirect(returnTo)
    })

    function parseReturnPath(req: Request) {
        return (req.query.returnTo as string) || "/"
    }
}

export const authProvider: AuthProvider | null = googleConfig
    ? GoogleAuthProvider(googleConfig)
    : genericOIDCConfig
    ? GenericOIDCAuthProvider(genericOIDCConfig)
    : null
