import dotenv from "dotenv"
dotenv.config()
import express from "express"
import * as Http from "http"
import IO from "socket.io"
import { connectionHandler } from "./connection-handler"
import { initDB } from "./db"
import fs from "fs"
import { getConfig } from "./config"
import { awaitSavingChanges as waitUntilChangesSaved } from "./board-state"
import { createGetSignedPutUrl } from "./storage"
import { terminateSessions } from "./sessions"
import _ from "lodash"
import routes from "./routes"

const configureServer = () => {
    const config = getConfig()

    const app = express()
    let http = new Http.Server(app)
    let io = IO(http)

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

    app.use(routes)

    io.on("connection", connectionHandler({ getSignedPutUrl: createGetSignedPutUrl(config.storageBackend) }))

    return http
}

let http: Http.Server | null = null

async function shutdown() {
    console.log("Shutdown initiated. Closing sockets.")
    if (http) http.close()
    terminateSessions()
    console.log("Shutdown in progress. Waiting for all changes to be saved...")
    await waitUntilChangesSaved()
    console.log("Shutdown complete. Exiting process.")
    process.exit(0)
}

process.on("SIGTERM", () => {
    console.log("Received SIGTERM. Initiating shutdown.")
    shutdown()
})

const port = process.env.PORT || 1337

initDB()
    .then(() => {
        http = configureServer()
        http.listen(port, () => {
            console.log("Listening on port " + port)
        })
    })
    .catch((e) => {
        console.error(e)
    })
