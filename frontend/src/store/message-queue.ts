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

export default function (socket: WebSocket, boardId: Id | undefined) {
    let connected = socket.readyState === socket.OPEN
    let canFlush = boardId ? false : true
    const localStorageKey = `queue_${boardId}`
    const state = localStorageAtom<QueueState>(localStorageKey, {
        queue: [],
        sent: [],
    })
    state.modify((s) => ({ ...s, sent: [] })) // stop waiting for acks if they were persisted

    function setSocket(newSocket: WebSocket) {
        socket = newSocket
    }

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

    function setFlushing(flushing: boolean) {
        canFlush = flushing
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
        setFlushing,
        enqueue,
        sendImmediately,
        onConnect,
        queueSize: queueSize,
        ack,
        setSocket,
    }
}
