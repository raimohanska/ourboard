import * as L from "lonna"
import { globalScope } from "lonna"
import { addOrReplaceEvent } from "../../../common/src/action-folding"
import { EventFromServer, isLocalUIEvent, UIEvent } from "../../../common/src/domain"
import { sleep } from "../../../common/src/sleep"
import MessageQueue from "./message-queue"

export type Dispatch = (e: UIEvent) => void

const SERVER_EVENTS_BUFFERING_MILLIS = 20

export type ServerConnection = ReturnType<typeof serverConnection>

export function serverConnection() {
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
    const messageQueue = MessageQueue(null)
    let socket = initSocket()

    async function reconnect(reconnectSocket: WebSocket) {
        await sleep(1000)
        if (reconnectSocket === socket) {
            console.log("reconnecting...")
            socket = initSocket()
        }
    }


    function initSocket() {
        let ws: WebSocket
        ws = new WebSocket(`ws://${location.host}/socket/board`)

        ws.addEventListener('error', e => { 
            console.error("Web socket error"); 
            reconnect(ws)
        });
        ws.addEventListener('open', () => { 
            console.log("Websocket connected"); 
            messageQueue.onConnect()
            connected.set(true)
        });
        ws.addEventListener('message', str => { 
            const event = JSON.parse(str.data)
            if (event.action === "ack") {
                messageQueue.ack()
            } else {
                serverEvents.push(event)
            }
        });

        ws.addEventListener('close', () => {
            console.log("Socket disconnected")
            connected.set(false)
            reconnect(ws)            
        });

        messageQueue.setSocket(ws)
        return ws
    }

    function newSocket() {
        console.log("New socket")
        socket.close()
        socket = initSocket()
    }
    uiEvents.pipe(L.filter((e: UIEvent) => !isLocalUIEvent(e))).forEach(messageQueue.enqueue)

    // uiEvents.log("UI")
    // serverEvents.log("Server")

    const events = L.merge(uiEvents, bufferedServerEvents)

    return {
        uiEvents,
        messageQueue,
        bufferedServerEvents,
        dispatch,
        connected,
        events,
        queueSize: messageQueue.queueSize,
        newSocket,
    }
}
