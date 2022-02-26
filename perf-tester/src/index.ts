import { sleep } from "../../common/src/sleep"
import { isNote, newNote, Point } from "../../common/src/domain"
import { GenericServerConnection } from "../../frontend/src/store/server-connection"
import WebSocket from "ws"
import _ from "lodash"
import * as L from "lonna"
import { NOTE_COLORS } from "../../common/src/colors"

// hack, sue me
// @ts-ignore
global.localStorage = {}

function add(a: Point, b: Point) {
    return { x: a.x + b.x, y: a.y + b.y }
}

function createTester(nickname: string, boardId: string) {
    let counter = 0
    const center = { x: 10 + Math.random() * 60, y: 10 + Math.random() * 40 }
    const radius = 10 + Math.random() * 10
    const increment = Math.random() * 4 - 2
    const WS_ADDRESS = `${DOMAIN ? "wss" : "ws"}://${DOMAIN ?? "localhost:1337"}/socket/board/${boardId}`

    let connection = GenericServerConnection(WS_ADDRESS, L.constant(false), (s) => new WebSocket(s) as any)

    connection.connected
        .pipe(
            L.changes,
            L.filter((c) => c),
        )
        .forEach(() => {
            connection.send({ action: "board.join", boardId })
        })
    connection.bufferedServerEvents.forEach((event) => {
        if (event.action === "board.init" && "board" in event) {
            const boardAtInit = event.board
            const notes = Object.values(boardAtInit.items).filter(isNote)
            setInterval(() => {
                counter += increment
                const position = add(center, {
                    x: radius * Math.sin(counter / 100),
                    y: radius * Math.cos(counter / 100),
                })
                connection.send({ action: "cursor.move", position, boardId })
                if (Math.random() < notesPerInterval) {
                    const note = newNote("NOTE " + counter, "black", position.x, position.y)
                    notes.push(note)
                    connection.send({
                        action: "item.add",
                        boardId,
                        items: [note],
                        connections: [],
                    })
                }
                if (Math.random() < editsPerInterval) {
                    const target = _.sample(notes)!
                    const updated = { ...target, text: "EDIT " + counter, color: _.sample(NOTE_COLORS)?.color! }
                    connection.send({
                        ackId: "perf",
                        events: [
                            {
                                action: "item.front",
                                boardId,
                                itemIds: [updated.id],
                            },
                            {
                                action: "item.update",
                                boardId,
                                items: [updated],
                            },
                        ],
                    })
                }
            }, interval)
        }
        if (event.action === "board.join.ack") {
            connection.send({ action: "nickname.set", nickname })
        }
    })
}

// Environment variables.
const USER_COUNT = parseInt(process.env.USER_COUNT ?? "10")
const BOARD_ID = process.env.BOARD_ID
if (!BOARD_ID) {
    throw Error("BOARD_ID missing. Please specify one more board ids separated by comma (,)")
}
const BOARD_IDS = BOARD_ID.split(",")
const DOMAIN = process.env.DOMAIN

const NOTES_PER_SEC = parseFloat(process.env.NOTES_PER_SEC ?? "0.1")
const EDITS_PER_SEC = parseFloat(process.env.EDITS_PER_SEC ?? "0")
const CURSOR_MOVES_PER_SEC = parseFloat(process.env.CURSOR_MOVES_PER_SEC ?? "10")

// Calculated vars
const interval = 1000 / CURSOR_MOVES_PER_SEC
const notesPerInterval = (NOTES_PER_SEC / 1000) * interval
const editsPerInterval = (EDITS_PER_SEC / 1000) * interval
console.log(
    `Starting ${USER_COUNT} testers, moving cursors ${CURSOR_MOVES_PER_SEC}/sec, creating notes ${NOTES_PER_SEC}`,
)
console.log(`Total cursor events ${CURSOR_MOVES_PER_SEC * USER_COUNT}/s`)
console.log(`Total creation events ${NOTES_PER_SEC * USER_COUNT}/s`)

for (let i = 0; i < USER_COUNT; i++) {
    createTester("perf-tester-" + (i + 1), BOARD_IDS[i % BOARD_IDS.length])
}
