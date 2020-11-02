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
                return replaceInQueue(evt => evt.action === "cursor.move")
            }
            else if (event.action === "item.move") {
                return replaceInQueue(evt => evt.action === "item.move" && evt.boardId === event.boardId && evt.itemId === event.itemId)
            }
            else if (event.action === "item.update") {
                if (event.action === "item.update" && event.item.type === "note") {
                    console.log("Enqueue text", event.item.text)
                }
                return replaceInQueue(evt => evt.action === "item.update" && evt.boardId === event.boardId && evt.item.id === event.item.id)                
            }
            else if (event.action === "item.lock" || event.action === "item.unlock") {
                return replaceInQueue(evt => evt.action === event.action && evt.boardId === event.boardId && evt.itemId === event.itemId)                
            }
            return q.concat(event)

            function replaceInQueue(matchFn: (e: AppEvent) => boolean) {
                const idx = q.findIndex(matchFn)
                if (idx === -1) {
                    return q.concat(event)
                }
                return [...q.slice(0, idx), event, ...q.slice(idx+1)]
            }
        })
    }
    queue.pipe(L.throttle(2000)).forEach(q => localStorage.messageQueue = JSON.stringify(q))
    const queueSize = L.view(queue, "length")

    return { 
        enqueue,
        queueSize: queueSize
    }
}
