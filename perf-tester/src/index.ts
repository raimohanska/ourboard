import io from "socket.io-client"

import * as G from "../../frontend/src/board/geometry"
import { newNote } from "../../common/src/domain"
import * as L from "lonna"
import { AppEvent, EventFromServer, Id } from "../../common/src/domain"
import MessageQueue from "../../frontend/src/store/message-queue"

function createTester(nickname: string) {
    let counter = 0
    const center = { x: 10 + Math.random() * 60, y: 10 + Math.random() * 40 }
    const radius = 10 + Math.random() * 10
    const increment = Math.random() * 4 - 2
    const boardId = "default"
    const socket = io("http://localhost:1337")
    const messageQueue = MessageQueue(socket)

    socket.on("connect", () => {
        console.log("Socket connected")
        messageQueue.onConnect()
        console.log("Joining board")
        messageQueue.enqueue({ action: "board.join", boardId })
    })
    socket.on("disconnect", () => {
        console.log("Socket disconnected")
    })
    socket.on("message", function (kind: string, e: EventFromServer) {
        if (kind === "app-event") {
            if (e.action === "board.init") {
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
            if (e.action === "board.join.ack") {
                messageQueue.enqueue({ action: "nickname.set", nickname })
            }
        }
    })
}

const userCount = 100
const fps = 10
for (let i = 0; i < userCount; i++) {
    createTester("perf-tester-" + (i + 1))
}
