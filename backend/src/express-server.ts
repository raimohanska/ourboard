import dotenv from "dotenv"
import express from "express"
import expressWs from "express-ws"
import fs from "fs"
import * as Http from "http"
import * as Https from "https"
import * as path from "path"
import * as swaggerUi from "swagger-ui-express"
import apiRoutes from "./api/api-routes"
import { handleBoardEvent } from "./board-event-handler"
import { getConfig } from "./config"
import { connectionHandler } from "./connection-handler"
import { authProvider, setupAuth } from "./oauth"
import openapiDoc from "./openapi"
import { createGetSignedPutUrl } from "./storage"
import { WsWrapper } from "./ws-wrapper"
import { getEnv } from "./env"
import { getAuthenticatedUser } from "./http-session"

dotenv.config()

export const startExpressServer = (httpPort?: number, httpsPort?: number): (() => void) => {
    const config = getConfig()

    const app = express()

    if (authProvider) {
        setupAuth(app, authProvider)
    }

    if (process.env.REQUIRE_AUTH === "true") {
        // Require authentication for all resources except the URLs bound by setupAuth above
        app.use("/", (req: express.Request, res: express.Response, next: express.NextFunction) => {
            if (!getAuthenticatedUser(req)) {
                res.redirect("/login")
            } else {
                next()
            }
        })
    }

    app.use("/", express.static("../frontend/dist"))
    app.use("/", express.static("../frontend/public"))

    if (config.storageBackend.type === "LOCAL") {
        const localDirectory = config.storageBackend.directory
        app.put("/assets/:id", (req, res) => {
            if (!req.params.id) {
                return res.sendStatus(400)
            }

            const w = fs.createWriteStream(localDirectory + "/" + req.params.id)

            req.pipe(w)

            req.on("end", () => {
                !res.headersSent && res.sendStatus(200)
            })

            w.on("error", () => {
                res.sendStatus(500)
            })
        })
        app.use("/assets", express.static(localDirectory))
    }

    app.get("/assets/external", (req, res) => {
        const src = req.query.src
        if (typeof src !== "string" || ["http://", "https://"].every((prefix) => !src.startsWith(prefix)))
            return res.send(400)
        const protocol = src.startsWith("https://") ? Https : Http

        protocol
            .request(src, (upstreamResponse) => {
                res.writeHead(upstreamResponse.statusCode!, upstreamResponse.headers)
                upstreamResponse
                    .pipe(res, {
                        end: true,
                    })
                    .on("error", (err) => res.status(500).send(err.message))
            })
            .end()
    })

    app.get("/b/:boardId", async (req, res) => {
        res.sendFile(path.resolve("../frontend/dist/index.html"))
    })

    app.use(apiRoutes.handler())

    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapiDoc))

    let stop = () => {}

    if (httpPort) {
        const http = new Http.Server(app)
        startWs(http, app)
        http.listen(httpPort, () => {
            console.log("Listening HTTP on port " + httpPort)
        })
        const prevStop = stop
        stop = () => {
            prevStop()
            http.close()
        }
    }

    if (httpsPort) {
        let https = new Https.Server(
            {
                cert: fs.readFileSync(getEnv("HTTPS_CERT_FILE")),
                key: fs.readFileSync(getEnv("HTTPS_KEY_FILE")),
            },
            app,
        )
        startWs(https, app)
        https.listen(httpsPort, () => {
            console.log("Listening HTTPS on port " + httpsPort)
        })
        const prevStop = stop
        stop = () => {
            prevStop()
            https.close()
        }
    }

    const redirectURL = process.env.REDIRECT_URL
    if (redirectURL) {
        app.get("*", function (req, res, next) {
            if (req.headers["x-forwarded-proto"] !== "https") {
                res.redirect(redirectURL)
            } else {
                next()
            }
        })
    }
    return stop
}

function startWs(http: any, app: express.Express) {
    const ws = expressWs(app, http)

    const signedPutUrl = createGetSignedPutUrl(getConfig().storageBackend)

    ws.app.ws("/socket/lobby", (socket, req) => {
        connectionHandler(WsWrapper(socket), handleBoardEvent(null, signedPutUrl))
    })
    ws.app.ws("/socket/board/:boardId", (socket, req) => {
        const boardId = req.params.boardId
        connectionHandler(WsWrapper(socket), handleBoardEvent(boardId, signedPutUrl))
    })
}
