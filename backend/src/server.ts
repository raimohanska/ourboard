import dotenv from "dotenv"
dotenv.config()

import * as Http from "http"
import { exampleBoard } from "../../common/src/domain"
import { awaitSavingChanges } from "./board-state"
import { createBoard, fetchBoard } from "./board-store"
import { initDB } from "./db"
import { startExpressServer } from "./express-server"
import { terminateSessions } from "./websocket-sessions"

let stopServer: (() => void) | null = null

async function shutdown() {
    console.log("Shutdown initiated. Closing sockets.")
    if (stopServer) stopServer()
    terminateSessions()
    console.log("Shutdown in progress. Waiting for all changes to be saved...")
    await awaitSavingChanges()
    console.log("Shutdown complete. Exiting process.")
    process.exit(0)
}

process.on("SIGTERM", () => {
    console.log("Received SIGTERM. Initiating shutdown.")
    shutdown()
})

const PORT = parseInt(process.env.PORT || "1337")
const HTTPS_PORT = process.env.HTTPS_PORT ? parseInt(process.env.HTTPS_PORT) : undefined
const BIND_UWEBSOCKETS_TO_PORT = process.env.BIND_UWEBSOCKETS_TO_PORT === "true"
if (BIND_UWEBSOCKETS_TO_PORT && process.env.UWEBSOCKETS_PORT) {
    throw Error("Cannot have both UWEBSOCKETS_PORT and BIND_UWEBSOCKETS_TO_PORT envs")
}
const HTTP_PORT = BIND_UWEBSOCKETS_TO_PORT ? null : PORT
const UWEBSOCKETS_PORT = BIND_UWEBSOCKETS_TO_PORT
    ? PORT
    : process.env.UWEBSOCKETS_PORT
    ? parseInt(process.env.UWEBSOCKETS_PORT)
    : null

initDB()
    .then(async () => {
        if (!(await fetchBoard("default"))) {
            await createBoard(exampleBoard)
        }
    })
    .then(() => {
        if (HTTP_PORT) {
            stopServer = startExpressServer(HTTP_PORT, HTTPS_PORT)
        }
        if (UWEBSOCKETS_PORT) {
            import("./uwebsockets-server").then((uwebsockets) => {
                uwebsockets.startUWebSocketsServer(UWEBSOCKETS_PORT)
            })
        }
    })
    .catch((e) => {
        console.error(e)
    })
