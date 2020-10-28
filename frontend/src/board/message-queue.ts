import * as L from "lonna";
import io from 'socket.io-client';
import { AppEvent } from "../../../common/domain";

const noop = () => {}
export default function(socket: typeof io.Socket) {
    const queue = L.atom<AppEvent[]>(localStorage.messageQueue ? JSON.parse(localStorage.messageQueue) : [])

    async function* eventGenerator() {
        // Wait for ack
        let releaseServerAckSemaphore = noop
        let serverAckSemaphore = Promise.resolve()
        
        // Wait for non-empty queue
        let releaseEmptyQueueSemaphore = noop
        let emptyQueueSemaphore = newEmptyQueueSemaphore()
        
        function newEmptyQueueSemaphore() {
            return new Promise(resolve => {
                releaseEmptyQueueSemaphore = resolve
            })
        }

        function newServerAckSemaphore() {
            return new Promise(resolve => {
                releaseServerAckSemaphore = resolve
            })
        }

        let buffer: AppEvent[] = []

        queue.forEach(q => {
            if (!buffer.length && q.length) {
                releaseEmptyQueueSemaphore()
            } else if (buffer.length && !q.length) {
                emptyQueueSemaphore = newEmptyQueueSemaphore()
            }

            if (q.length < buffer.length) releaseServerAckSemaphore()
            buffer = q
        })

        while (true) {
            await emptyQueueSemaphore
            yield buffer[0]
            serverAckSemaphore = newServerAckSemaphore() as Promise<void>
            await serverAckSemaphore
        }
    }

    (async function sendLoop(g: AsyncGenerator<AppEvent, void, unknown>) {
        for await (const evt of g) {
            socket.send("app-event", evt, dequeue)
        }
    })(eventGenerator())

    function dequeue() {
        queue.modify(q => q.slice(1))
    }

    function enqueue(event: AppEvent) {
        // Compact queue when possible (cursor movements and item drags are quite frequent)
        queue.modify(q => {
            if (event.action === "cursor.move") {
                const idx = q.findIndex(evt => evt.action === "cursor.move")
                if (idx === -1) {
                    return q.concat(event)
                } else return [...q.slice(0, idx), event, ...q.slice(idx+1)]
            }
            else if (event.action === "item.update") {
                const idx = q.findIndex(evt => evt.action === "item.update" && evt.boardId === event.boardId && evt.item.id === event.item.id)
                if (idx === -1) {
                    return q.concat(event)
                } else return [...q.slice(0, idx), event, ...q.slice(idx+1)]                
            }
            return q.concat(event)
        })
    }

    function replayBuffer(fn: (e: AppEvent) => void) {
        queue.get().forEach(fn)
    }


    queue.pipe(L.throttle(2000)).forEach(q => localStorage.messageQueue = JSON.stringify(q))
    const queueSize = L.view(queue, "length")

    return { 
        enqueue,
        replayBuffer,
        queueSize: queueSize
    }
}
