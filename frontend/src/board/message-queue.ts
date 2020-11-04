import * as L from "lonna";
import io from 'socket.io-client';
import { AppEvent, MoveItem, UpdateItem, PersistableBoardItemEvent } from "../../../common/domain";

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
        state.modify(s =>({ ...s, queue: addEventToQueue(event, s.queue) }))
        sendIfPossible()
    }

    function onConnect() {
        // Stop waiting for acks for messages from earlier sessions, no way to know whether they
        // were received or not. 
        state.modify(s => ({ ...s, sent: [] }))
        sendIfPossible() 
    }

    function everyItemMatches(evt: MoveItem | UpdateItem, evt2: MoveItem | UpdateItem) {
        return evt.items.length === evt2.items.length && evt.items.every((it, ind) => evt2.items[ind].id === it.id)
    }

    function addEventToQueue(event: AppEvent, q: AppEvent[]) {
        if (event.action === "cursor.move") {
            return replaceInQueue(evt => evt.action === "cursor.move")
        }
        else if (event.action === "item.move") {
            return replaceInQueue(evt => evt.action === "item.move" && evt.boardId === event.boardId && everyItemMatches(evt, event))
        }
        else if (event.action === "item.update") {
            return replaceInQueue(evt => evt.action === "item.update" && evt.boardId === event.boardId && everyItemMatches(evt, event))                
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
    }

    const queueSize = L.view(state, s => s.queue.length + s.sent.length)

    return { 
        enqueue,
        onConnect,
        queueSize: queueSize
    }
}
