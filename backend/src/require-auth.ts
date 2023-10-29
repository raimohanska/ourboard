import { Express, Request, Response, NextFunction } from "express"
import { getAuthenticatedUser } from "./http-session"

export const REQUIRE_AUTH = process.env.REQUIRE_AUTH === "true"

export function possiblyRequireAuth(app: Express) {
    if (REQUIRE_AUTH) {
        // Require authentication for all resources except the URLs bound by setupAuth above
        app.use("/", (req: Request, res: Response, next: NextFunction) => {
            if (!getAuthenticatedUser(req)) {
                res.redirect("/login")
            } else {
                next()
            }
        })
    }
}
