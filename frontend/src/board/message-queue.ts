import * as L from "lonna";
import io from 'socket.io-client';
import { AppEvent } from "../../../common/src/domain";
import { canFoldActions } from "./action-folding"

const noop = () => {}
type QueueState = {
    queue: AppEvent[],
    sent: AppEvent[]
}
export default function(socket: typeof io.Socket) {
    let state = L.atom<QueueState>({
        queue: [],
        sent: []
    })

    function sendIfPossible() {
        state.modify(s => {
            if (s.sent.length > 0 || s.queue.length === 0) return s
            //console.log("Send", s.queue.length)
            socket.send("app-events", s.queue, ack)    
            return {
                queue: [],
                sent: s.queue
            }
        })
    }

    function ack() {
        state.modify(s => ({ ...s, sent: [] }))
        sendIfPossible()
    }

    function enqueue(event: AppEvent) {
        state.modify(s =>({ ...s, queue: addOrReplaceEvent(event, s.queue) }))
        sendIfPossible()
    }

    function onConnect() {
        // Stop waiting for acks for messages from earlier sessions, no way to know whether they
        // were received or not. 
        state.modify(s => ({ ...s, sent: [] }))
        sendIfPossible() 
    }

    const queueSize = L.view(state, s => s.queue.length + s.sent.length)

    return { 
        enqueue,
        onConnect,
        queueSize: queueSize
    }
}


function addOrReplaceEvent(event: AppEvent, q: AppEvent[]) {
    const idx = q.findIndex(evt => canFoldActions(event, evt))
    if (idx === -1) {
        return q.concat(event)
    }
    return [...q.slice(0, idx), event, ...q.slice(idx+1)]
}