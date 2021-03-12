import * as G from "../../frontend/src/board/geometry"
import { newNote } from "../../common/src/domain"
import * as L from "lonna"
import { AppEvent, EventFromServer, Id } from "../../common/src/domain"
import { sleep } from "../../common/src/sleep"
import MessageQueue from "../../frontend/src/store/message-queue"
import WebSocket from "ws"

function createTester(nickname: string) {
    let counter = 0
    const center = { x: 10 + Math.random() * 60, y: 10 + Math.random() * 40 }
    const radius = 10 + Math.random() * 10
    const increment = Math.random() * 4 - 2
    const boardId = "default"

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
        ws = new WebSocket(`ws://localhost:1337/socket/board/${boardId}`)

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
                        const position = G.add(center, {
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
        return [ws, MessageQueue(ws)] as const
    }
}

const userCount = 100
const fps = 10
for (let i = 0; i < userCount; i++) {
    createTester("perf-tester-" + (i + 1))
}
