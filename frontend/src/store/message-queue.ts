import * as L from "lonna"
import io from "socket.io-client"
import { AppEvent, Id, Serial } from "../../../common/src/domain"
import { addOrReplaceEvent } from "../../../common/src/action-folding"

type QueueState = {
    queue: AppEvent[]
    sent: AppEvent[]
}

type Sender = {
    send: (...args: any[]) => any
}

export default function (socket: Sender | null) {
    const state = L.atom<QueueState>({
        queue: [],
        sent: [],
    })

    function sendIfPossible() {
        state.modify((s) => {
            if (s.sent.length > 0 || s.queue.length === 0) return s
            //console.log("Sending", s.queue)
            socket!.send("app-events", s.queue, ack)
            return {
                queue: [],
                sent: s.queue,
            }
        })
    }

    function ack() {
        state.modify((s) => ({ ...s, sent: [] }))
        sendIfPossible()
    }

    function enqueue(event: AppEvent) {
        state.modify((s) => ({ ...s, queue: addOrReplaceEvent(event, s.queue) }))
        sendIfPossible()
    }

    function onConnect() {
        // Stop waiting for acks for messages from earlier sessions, no way to know whether they
        // were received or not.
        state.modify((s) => ({ ...s, sent: [] }))
        sendIfPossible()
    }

    const queueSize = L.view(state, (s) => s.queue.length + s.sent.length)

    return {
        enqueue,
        onConnect,
        queueSize: queueSize,
        setSocket(newSocket: Sender) {
            socket = newSocket
        },
    }
}
