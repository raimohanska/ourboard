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
import openapiDoc from "./openapi"
import { createGetSignedPutUrl } from "./storage"
import { WsWrapper } from "./ws-wrapper"
dotenv.config()

export const startExpressServer = (port: number) => {
    const config = getConfig()

    const app = express()

    let http = new Http.Server(app)
    const ws = expressWs(app, http)

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

    const signedPutUrl = createGetSignedPutUrl(config.storageBackend)
    ws.app.ws("/socket/lobby", (socket, req) => {
        connectionHandler(WsWrapper(socket), handleBoardEvent(null, signedPutUrl))
    })
    ws.app.ws("/socket/board/:boardId", (socket, req) => {
        const boardId = req.params.boardId
        connectionHandler(WsWrapper(socket), handleBoardEvent(boardId, signedPutUrl))
    })

    http.listen(port, () => {
        console.log("Listening on port " + port)
    })

    return http
}
