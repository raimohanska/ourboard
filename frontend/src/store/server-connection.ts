import * as L from "lonna"
import { globalScope } from "lonna"
import { addOrReplaceEvent } from "../../../common/src/action-folding"
import { AppEvent, EventFromServer, Id, isLocalUIEvent, UIEvent } from "../../../common/src/domain"
import { sleep } from "../../../common/src/sleep"
import MessageQueue from "./message-queue"

export type Dispatch = (e: UIEvent) => void

const SERVER_EVENTS_BUFFERING_MILLIS = 20

export type ServerConnection = ReturnType<typeof serverConnection>

export function serverConnection(initialBoardId: Id | undefined) {
    const uiEvents = L.bus<UIEvent>()
    const dispatch: Dispatch = uiEvents.push
    const serverEvents = L.bus<EventFromServer>()
    const bufferedServerEvents = serverEvents.pipe(
        L.bufferWithTime(SERVER_EVENTS_BUFFERING_MILLIS),
        L.flatMap((events) => {
            return L.fromArray(
                events.reduce((folded, next) => addOrReplaceEvent(next, folded), [] as EventFromServer[]),
            )
        }, globalScope),
    )

    const connected = L.atom(false)
    let [socket, messageQueue] = initSocket(initialBoardId)

    setInterval(() => {
        if (!document.hidden) {
            messageQueue.enqueue({ action: "ping" })
        }
    }, 30000)

    function initSocket(boardId: Id | undefined) {
        const protocol = location.protocol === "http:" ? "ws:" : "wss:"
        const ws = new WebSocket(`${protocol}//${location.host}/socket/${boardId ? "board/" + boardId : "lobby"}`)

        ws.addEventListener("error", (e) => {
            console.error("Web socket error")
            reconnect()
        })
        ws.addEventListener("open", () => {
            console.log("Websocket connected")
            messageQueue.onConnect()
            connected.set(true)
        })
        ws.addEventListener("message", (str) => {
            const event = JSON.parse(str.data)
            if (event.action === "ack") {
                messageQueue.ack()
            } else {
                serverEvents.push(event)
            }
        })

        ws.addEventListener("close", () => {
            console.log("Socket disconnected")
            connected.set(false)
            reconnect()
        })

        return [ws, MessageQueue(ws, boardId)] as const

        async function reconnect() {
            await sleep(1000)
            if (ws === socket) {
                console.log("reconnecting...")
                ;[socket, messageQueue] = initSocket(boardId)
            }
        }
    }

    function newSocket(boardId: Id | undefined) {
        console.log("New socket")
        socket.close()
        ;[socket, messageQueue] = initSocket(boardId)
    }
    uiEvents.pipe(L.filter((e: UIEvent) => !isLocalUIEvent(e))).forEach((e) => messageQueue.enqueue(e))

    // uiEvents.log("UI")
    // serverEvents.log("Server")

    const events = L.merge(uiEvents, bufferedServerEvents)

    return {
        uiEvents,
        enqueue: (e: AppEvent) => messageQueue.enqueue(e),
        sendImmediately: (e: AppEvent) => messageQueue.sendImmediately(e),
        bufferedServerEvents,
        dispatch,
        connected,
        events,
        queueSize: messageQueue.queueSize,
        newSocket,
        startFlushing: () => messageQueue.startFlushing()
    }
}
