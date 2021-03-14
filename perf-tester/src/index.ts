import { sleep } from "../../common/src/sleep"
import { Point } from "../../common/src/domain"
import MessageQueue from "../../frontend/src/store/message-queue"
import WebSocket from "ws"

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

    let [socket, messageQueue] = initSocket()

    async function reconnect(reconnectSocket: WebSocket) {
        await sleep(1000)
        if (reconnectSocket === socket) {
            console.log("reconnecting...")
            ;[socket, messageQueue] = initSocket()
        }
    }
    function initSocket() {
        let ws: WebSocket
        const protocol = process.env.DOMAIN ? "wss" : "ws"
        ws = new WebSocket(`${protocol}://${process.env.DOMAIN ?? "localhost:1337"}/socket/board/${boardId}`)

        ws.addEventListener("error", (e) => {
            console.error("Web socket error")
            reconnect(ws)
        })
        ws.addEventListener("open", () => {
            console.log("Websocket connected")
            messageQueue.onConnect()
            console.log("Joining board")
            messageQueue.enqueue({ action: "board.join", boardId })
        })
        ws.addEventListener("message", (str) => {
            const event = JSON.parse(str.data)
            if (event.action === "ack") {
                messageQueue.ack()
            } else {
                if (event.action === "board.init") {
                    setInterval(() => {
                        counter += increment
                        const position = add(center, {
                            x: radius * Math.sin(counter / 100),
                            y: radius * Math.cos(counter / 100),
                        })
                        messageQueue.enqueue({ action: "cursor.move", position, boardId })
                        //if (Math.random() < 0.01) store.dispatch({ action: "item.add", boardId, items: [
                        //newNote("NOTE " + counter, "black", position.x, position.y)
                        //] })
                    }, 1000 / fps)
                }
                if (event.action === "board.join.ack") {
                    messageQueue.enqueue({ action: "nickname.set", nickname })
                }
            }
        })

        ws.addEventListener("close", () => {
            console.log("Socket disconnected")
            reconnect(ws)
        })
        return [ws, MessageQueue(ws, undefined)] as const
    }
}

const kwargs = process.argv.slice(2)

const ACCEPTED_KWARGS = ["--userCount", "--boardId"]

const parsedKwargs: { userCount?: number; boardId?: string } = {}

for (let i = 0; i < kwargs.length - 1; i += 2) {
    const [argName, argValue] = [kwargs[i], kwargs[i + 1]]
    if (!ACCEPTED_KWARGS.includes(argName)) {
        throw Error(`Invalid argument ${argName}, expecting one or more of: ${ACCEPTED_KWARGS.join(", ")}`)
    }

    if (!argValue || argValue.startsWith("--")) {
        throw Error(`Invalid value for ${argName}, got ${argValue}`)
    }

    const argNameStripped = argName.slice(2)

    if (argNameStripped === "userCount") {
        const argValueParsed = Number(argValue)
        if (!Number.isInteger(argValueParsed)) {
            throw Error(`Expected integer value for userCount, got ${argValue}`)
        }
        parsedKwargs[argNameStripped] = argValueParsed
    } else if (argNameStripped === "boardId") {
        parsedKwargs[argNameStripped] = argValue
    }
}

const userCount = parsedKwargs.userCount ?? 100
const boardId = parsedKwargs.boardId ?? "default"

const fps = 10
for (let i = 0; i < userCount; i++) {
    createTester("perf-tester-" + (i + 1), boardId)
}
