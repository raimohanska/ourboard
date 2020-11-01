import * as L from "lonna";
import io from 'socket.io-client';
import { AppEvent } from "../../../common/domain";

const noop = () => {}
export default function(socket: typeof io.Socket) {
    const queue = L.atom<AppEvent[]>(localStorage.messageQueue ? JSON.parse(localStorage.messageQueue) : []);
    let head = L.atom<AppEvent | null>(null)

    queue.forEach(q => {
        if (q[0] && !head.get()) head.set(q[0])
    })

    head.forEach(e => {
        e && socket.send("app-event", e, () => {
            head.set(null)
            const next = queue.get()[0]
            if (!next || next === e) {
                queue.modify(q => q.slice(1))
            } else {
                head.set(next)
            }
        })            
    })

    function enqueue(event: AppEvent) {
        // Compact queue when possible (cursor movements and item drags are quite frequent)
        queue.modify(q => {
            if (event.action === "cursor.move") {
                const idx = q.findIndex(evt => evt.action === "cursor.move")
                if (idx === -1) {
                    return q.concat(event)
                } else return [...q.slice(0, idx), event, ...q.slice(idx+1)]
            }
            else if (event.action === "item.move") {
                const idx = q.findIndex(evt => evt.action === "item.move" && evt.boardId === event.boardId && evt.itemId === event.itemId)
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
            else if (event.action === "item.lock" || event.action === "item.unlock") {
                const idx = q.findIndex(evt => evt.action === event.action && evt.boardId === event.boardId && evt.itemId === event.itemId)
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
