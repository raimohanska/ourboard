import * as L from "lonna"
import { globalScope } from "lonna"
import { addOrReplaceEvent } from "../../../common/src/action-folding"
import { AppEvent, EventFromServer, EventWrapper, UIEvent } from "../../../common/src/domain"
import { sleep } from "../../../common/src/sleep"

export type Dispatch = (e: UIEvent) => void

const SERVER_EVENTS_BUFFERING_MILLIS = 20

export type ServerConnection = ReturnType<typeof GenericServerConnection>

export type ConnectionStatus = "connecting" | "connected" | "sleeping" | "reconnecting"

export function BrowserSideServerConnection() {
    const documentHidden = L.fromEvent(document, "visibilitychange").pipe(
        L.toStatelessProperty(() => document.hidden || false),
    )

    const protocol = location.protocol === "http:" ? "ws:" : "wss:"
    const root = `${protocol}//${location.host}`
    //const root = "wss://www.ourboard.io"
    //const root = "ws://localhost:1339"
    return GenericServerConnection(`${root}/socket/lobby`, documentHidden, (s) => new WebSocket(s))
}

export function GenericServerConnection(
    initialSocketAddress: string,
    documentHidden: L.Property<boolean>,
    createSocket: (address: string) => WebSocket,
) {
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
    let currentSocketAddress = initialSocketAddress
    let socket = initSocket()

    setInterval(() => {
        if (documentHidden.get() && connectionStatus.get() === "connected") {
            console.log("Document hidden, closing socket")
            connectionStatus.set("sleeping")
            socket.close()
        } else {
            send({ action: "ping" })
        }
    }, 30000)

    documentHidden.onChange((hidden) => {
        if (!hidden && connectionStatus.get() === "sleeping") {
            console.log("Document shown, reconnecting.")
            newSocket()
        }
    })

    function initSocket() {
        connectionStatus.set("connecting")
        console.log("Connecting to " + currentSocketAddress)
        const ws = createSocket(currentSocketAddress)
        ws.addEventListener("error", (e) => {
            if (ws === socket) {
                console.error("Web socket error")
                reconnect()
            }
        })
        ws.addEventListener("open", () => {
            console.log("Socket connected")
            connectionStatus.set("connected")
        })
        ws.addEventListener("message", (str) => {
            const event = JSON.parse(str.data) as EventFromServer
            if (event.action === "board.join.denied" && event.reason === "redirect") {
                currentSocketAddress = event.wsAddress
                newSocket()
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

        return ws

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
        socket = initSocket()
    }

    function send(e: UIEvent | EventWrapper) {
        //console.log("Sending", e)
        if ("action" in e) sentUIEvents.push(e)
        let wrapper: EventWrapper
        if ("action" in e) {
            sentUIEvents.push(e)
            wrapper = { events: [e] }
        } else {
            wrapper = e
        }
        try {
            socket.send(JSON.stringify(wrapper))
        } catch (e) {
            console.error("Failed to send", e) // TODO
        }
    }
    const sentUIEvents = L.bus<UIEvent>()

    return {
        send,
        bufferedServerEvents,
        sentUIEvents: sentUIEvents as L.EventStream<UIEvent>,
        connected: L.view(connectionStatus, (s) => s === "connected"),
        newSocket,
    }
}
