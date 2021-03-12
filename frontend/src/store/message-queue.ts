import * as L from "lonna"
import { AppEvent, Id, isPersistableBoardItemEvent, Serial } from "../../../common/src/domain"
import { addOrReplaceEvent } from "../../../common/src/action-folding"
import { localStorageAtom } from "../board/local-storage-atom"

type QueueState = {
    queue: AppEvent[]
    sent: AppEvent[]
}

type Sender = {
    send: (...args: any[]) => any
}

export default function (socket: Sender, boardId: Id | undefined) {
    let connected = false
    let canFlush = boardId ? false : true
    const localStorageKey = `queue_${boardId}`
    const state = localStorageAtom<QueueState>(localStorageKey, {
        queue: [],
        sent: [],
    })

    function sendIfPossible() {
        if (!connected || !canFlush) return
        state.modify((s) => {
            if (s.sent.length > 0 || s.queue.length === 0) return s
            socket.send(JSON.stringify(s.queue))
            return {
                queue: [],
                sent: s.queue,
            }
        })
    }

    function startFlushing() {
        canFlush = true
    }

    function ack() {
        state.modify((s) => ({ ...s, sent: [] }))
        sendIfPossible()
    }

    function enqueue(event: AppEvent) {
        state.modify((s) => ({ ...s, queue: addOrReplaceEvent(event, s.queue) }))
        sendIfPossible()
    }

    function sendImmediately(event: AppEvent) {
        socket.send(JSON.stringify([event]))
    }

    function onConnect() {
        // Stop waiting for acks for messages from earlier sessions, no way to know whether they
        // were received or not.
        connected = true
        state.modify((s) => ({ ...s, sent: [] }))
        sendIfPossible()
    }

    const queueSize = L.view(state, (s) => s.queue.length + s.sent.length)

    return {
        startFlushing,
        enqueue,
        sendImmediately,
        onConnect,
        queueSize: queueSize,
        ack,
    }
}
