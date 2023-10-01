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
            // Because we are buffering events from the server and folding them on the client,
            // we may get overlapping event ranges.
            // This is not necessarily a problem, but it does mean that we cannot guarantee that
            // the serial numbers of events are sequential.
            //
            // Minimal example; our buffer of events from the server is:
            // #1. USER A MODIFIES NOTE 1, SERIAL 1
            // #2. USER B MODIFIES NOTE 2, SERIAL 2
            // #3. USER A MODIFIES NOTE 1, SERIAL 3
            // #4. USER B MODIFIES NOTE 2, SERIAL 4
            // Folding algorithm:
            // #1. Result array is empty, cannot fold, push #1 to array -> array contains [#1]
            // #2. Result array contains [#1], cannot fold, push #2 to array -> array contains [#1, #2]
            // #3. Result array contains [#1, #2], can fold to #1, replace the event -> array contains [FOLDED1-3, #2]
            // #4 Result array contains [FOLDED1-3, #2], can fold to #2, replace the event -> array contains [FOLDED1-3, FOLDED2-4]
            // Processing FOLDED1-3: firstSerial = 1, serial = 3 —> board.serial is at 3
            // FOLDED2-4: firstSerial = 2, serial = 4 —> warn: serial skip, firstSerial is 2 but board.serial is at 3
            // For this reason, we cannot make guarantees about the serial numbers of events, and we must allow for gaps.
            const folded = events
                .reduce((folded, next) => addOrReplaceEvent(next, folded), [] as EventFromServer[])
                .sort((a, b) => {
                    if (!("serial" in a) || a.serial === undefined) {
                        return 1
                    } else if (!("serial" in b) || b.serial === undefined) {
                        return -1
                    }

                    // Sort by serial number, so that at least when the client processes the events,
                    // the client's local serial number is always at least as high as the highest serial number
                    return a.serial - b.serial
                })
            return L.fromArray(folded)
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
