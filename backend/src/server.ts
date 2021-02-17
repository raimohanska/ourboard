import dotenv from "dotenv"
import express from "express"
import * as Http from "http"
import * as Https from "https"
import IO from "socket.io"
import { connectionHandler } from "./connection-handler"
import { initDB } from "./db"
import fs from "fs"
import path from "path"
import { getConfig } from "./config"
import bodyParser from "body-parser"
import {
    Board,
    createBoard,
    EventUserInfo,
    BoardHistoryEntry,
    AppEvent,
    newNote,
    Note,
    Color,
    PersistableBoardItemEvent,
} from "../../common/src/domain"
import { addBoard, getBoard, maybeGetBoard, updateBoards } from "./board-state"
import { createGetSignedPutUrl } from "./storage"
import { broadcastBoardEvent } from "./sessions"
import { encode as htmlEncode } from "html-entities"
import { item } from "lonna"

const configureServer = () => {
    dotenv.config()

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

    app.post("/api/v1/board", bodyParser.json(), async (req, res) => {
        let { name } = req.body
        if (!name) {
            res.status(400).send('Expecting JSON document containing the field "name".')
        }
        let board: Board = createBoard(name)
        const boardWithHistory = await addBoard(board)
        res.json(boardWithHistory.board)
    })

    app.post("/api/v1/webhook/github/:boardId", bodyParser.json(), async (req, res) => {
        try {
            const boardId = req.params.boardId
            if (!boardId) {
                return res.sendStatus(400)
            }
            let body = req.body
            const board = await getBoard(boardId)
            if (board) {
                if (body.issue) {
                    const url = body.issue.html_url
                    const title = body.issue.title
                    const number = body.issue.number.toString()
                    if (!title) throw Error(`Github webhook call board ${boardId}: title missing`)
                    if (!url) throw Error(`Github webhook call board ${boardId}: url missing`)
                    const state = body.issue.state
                    if (state !== "open") {
                        console.log(`Github webhook call board ${boardId}: Item in ${state} state`)
                    } else {
                        const linkStart = `<a href=${url}>`
                        const linkHTML = `${linkStart}${htmlEncode(number)}</a> ${htmlEncode(title)}`
                        const existingItem = board.board.items.find(
                            (i) => i.type === "note" && i.text.includes(linkStart),
                        ) as Note | undefined
                        const isBug = body.issue.labels.some((l: any) => l.name === "bug")
                        const color = isBug ? "#E98AA7" : "#81BAE7"
                        if (!existingItem) {
                            console.log(`Github webhook call board ${boardId}: New item`)
                            return await addItem(boardId, "note", linkHTML, color, "New issues", res)
                        } else {
                            console.log(`Github webhook call board ${boardId}: Item exists`)
                            const updatedItem: Note = { ...existingItem, color }
                            return await dispatchSystemAppEvent(
                                { action: "item.update", boardId, items: [updatedItem] },
                                res,
                            )
                        }
                    }
                } else {
                    console.warn(
                        `Unrecognized content in webhook call board ${boardId}: ${JSON.stringify(body, null, 2)}`,
                    )
                }
            } else {
                console.warn(`Github webhook call for unknown board ${boardId}`)
            }
            res.sendStatus(200)
        } catch (e) {
            console.error(e)
            res.sendStatus(500)
        }
    })

    app.post("/api/v1/board/:boardId/item", bodyParser.json(), async (req, res) => {
        try {
            const boardId = req.params.boardId
            if (!boardId) {
                return res.sendStatus(400)
            }
            const { type, text, color, container } = req.body
            console.log(`POST item for board ${boardId}: ${JSON.stringify(req.body)}`)
            await addItem(boardId, type, text, color, container, res)
        } catch (e) {
            console.error(e)
            res.sendStatus(500)
        }
    })

    async function addItem(
        boardId: string,
        type: "note",
        text: string,
        color: Color,
        container: string,
        res: express.Response,
    ) {
        const board = await getBoard(boardId)
        if (!board) {
            return res.sendStatus(404)
        }
        if (type !== "note") return res.status(400).send("Expecting type: note")
        if (typeof text !== "string" || text.length === 0) return res.status(400).send("Expecting non zero-length text")
        let containerItem
        let itemAttributes
        if (container !== undefined) {
            if (typeof container !== "string") {
                return res
                    .status(400)
                    .send("Expecting container to be undefined, or an id or name of an Container item")
            }
            containerItem = board.board.items.find(
                (i) =>
                    i.type === "container" && (i.text.toLowerCase() === container.toLowerCase() || i.id === container),
            )
            if (!containerItem) {
                return res.status(400).send(`Container "${container}" not found by id or name`)
            }
            itemAttributes = {
                containedId: containerItem.id,
                x: containerItem.x + 2,
                y: containerItem.y + 2,
            }
        } else {
            itemAttributes = {}
        }

        const item: Note = { ...newNote(text, color || "#F5F18D"), ...itemAttributes }
        const appEvent: AppEvent = { action: "item.add", boardId: boardId, items: [item] }
        dispatchSystemAppEvent(appEvent, res)
    }

    async function dispatchSystemAppEvent(appEvent: PersistableBoardItemEvent, res: express.Response) {
        const user: EventUserInfo = { userType: "system", nickname: "Github webhook" }
        let historyEntry: BoardHistoryEntry = { ...appEvent, user, timestamp: new Date().toISOString() }
        console.log(JSON.stringify(historyEntry))
        // TODO: refactor, this is the same sequence as done in connection-handler for messages from clients
        const serial = await updateBoards(historyEntry)
        historyEntry = { ...historyEntry, serial }
        broadcastBoardEvent(historyEntry)
        res.status(200).json({ ok: true })
    }

    io.on("connection", connectionHandler({ getSignedPutUrl: createGetSignedPutUrl(config.storageBackend) }))

    return http
}

const port = process.env.PORT || 1337

initDB()
    .then(() => {
        const http = configureServer()
        http.listen(port, () => {
            console.log("Listening on port " + port)
        })
    })
    .catch((e) => {
        console.error(e)
    })
