import * as L from "lonna"
import { globalScope } from "lonna"
import { addOrReplaceEvent } from "../../../common/src/action-folding"
import { AppEvent, EventFromServer, Id, isLocalUIEvent, UIEvent } from "../../../common/src/domain"
import { sleep } from "../../../common/src/sleep"
import MessageQueue from "./message-queue"

export type Dispatch = (e: UIEvent) => void

const SERVER_EVENTS_BUFFERING_MILLIS = 20

export type ServerConnection = ReturnType<typeof serverConnection>

export type ConnectionStatus = "connecting" | "connected" | "sleeping" | "reconnecting"

export function serverConnection(currentBoardId: Id | undefined) {
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

    const connectionStatus = L.atom<ConnectionStatus>("connecting")
    let [socket, messageQueue] = initSocket(currentBoardId)

    setInterval(() => {
        if (documentHidden.get() && connectionStatus.get() === "connected") {
            console.log("Document hidden, closing socket")
            connectionStatus.set("sleeping")
            socket.close()
        } else {
            messageQueue.enqueue({ action: "ping" })
        }
    }, 30000)

    const documentHidden = L.fromEvent(document, "visibilitychange").pipe(
        L.toStatelessProperty(() => document.hidden || false),
    )
    documentHidden.onChange((hidden) => {
        if (!hidden && connectionStatus.get() === "sleeping") {
            console.log("Document shown, reconnecting.")
            newSocket()
        }
    })

    function initSocket(boardId: Id | undefined) {
        connectionStatus.set("connecting")
        const protocol = location.protocol === "http:" ? "ws:" : "wss:"
        const root = `${protocol}//${location.host}`
        //const root = "wss://www.ourboard.io"
        const ws = new WebSocket(`${root}/socket/${boardId ? "board/" + boardId : "lobby"}`)

        ws.addEventListener("error", (e) => {
            if (ws === socket) {
                console.error("Web socket error")
                reconnect()
            }
        })
        ws.addEventListener("open", () => {
            console.log("Socket connected")
            messageQueue.onConnect()
            connectionStatus.set("connected")
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
            if (ws === socket) {
                console.log("Socket disconnected")
                reconnect()
            }
        })

        return [ws, MessageQueue(ws, boardId)] as const

        async function reconnect() {
            if (documentHidden.get()) {
                connectionStatus.set("sleeping")
            } else {
                connectionStatus.set("reconnecting")
                await sleep(1000)
                if (ws === socket) {
                    console.log("reconnecting...")
                    newSocket()
                }
            }
        }
    }

    function newSocket() {
        socket.close()
        ;[socket, messageQueue] = initSocket(currentBoardId)
    }

    function setBoardId(boardId: Id | undefined) {
        if (boardId != currentBoardId) {
            currentBoardId = boardId
            newSocket()
        }
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
        connected: L.view(connectionStatus, (s) => s === "connected"),
        events,
        queueSize: messageQueue.queueSize,
        setBoardId,
        startFlushing: () => messageQueue.startFlushing(),
    }
}
