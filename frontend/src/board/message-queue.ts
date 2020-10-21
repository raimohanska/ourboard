import * as L from "lonna";
import io from 'socket.io-client';
import { AppEvent } from "../../../common/domain";

export default function(socket: typeof io.Socket) {
    const queue = L.atom<AppEvent[]>(localStorage.messageQueue ? JSON.parse(localStorage.messageQueue) : [])
    let waitingForAck = false

    function sendHead() {
        const q = queue.get()
        if (q.length) {
            waitingForAck = true
            socket.send("app-event", q[0], ack)
        }
    }

    function ack() {
        waitingForAck = false
        queue.modify(q => q.slice(1))
        sendHead()
    }

    function enqueue(event: AppEvent) {
        queue.modify(q => q.concat(event))
        sendHead()
    }

    function replayBuffer(fn: (e: AppEvent) => void) {
        queue.get().forEach(fn)
    }


    queue.pipe(L.throttle(2000)).forEach(q => localStorage.messageQueue = JSON.stringify(q))
    const queueSize = L.view(queue, "length")

    queueSize.log("Queue size")

    return { 
        enqueue,
        replayBuffer,
        flush: sendHead,
        queueSize: queueSize
    }
}
