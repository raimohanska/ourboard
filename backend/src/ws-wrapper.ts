import * as WebSocket from "ws"
import * as uuid from "uuid"
import { EventFromServer } from "../../common/src/domain"

export const WsWrapper = (ws: WebSocket) => {
    const onError = (f: () => void) => {
        ws.addEventListener("error", f)
    }
    const onMessage = (f: (msg: object) => void) => {
        ws.addEventListener("message", (msg: any) => {
            try {
                f(JSON.parse(msg.data))
            } catch (e) {
                console.error("Error in WsWrapper/onMessage. Closing connection.", e)
                ws.close()
            }
        })
    }
    const onClose = (f: () => void) => {
        ws.addEventListener("close", f)
    }
    return {
        send: (msg: EventFromServer, cache?: StringifyCache) => {
            try {
                ws.send(cache ? cache.stringify(msg) : JSON.stringify(msg))
            } catch (e) {
                ws.close()
            }
        },
        onError,
        onMessage,
        onClose,
        id: uuid.v4(),
        close: () => ws.close(),
    }
}
export type WsWrapper = ReturnType<typeof WsWrapper>

export function StringifyCache() {
    const cache = new Map<any, string>()
    const stringify = (msg: any) => {
        let cached = cache.get(msg)
        if (!cached) {
            //console.log("Stringify")
            cached = JSON.stringify(msg)
            cache.set(msg, cached)
        } else {
            //console.log("Using cached")
        }
        return cached
    }
    return {
        stringify,
    }
}
export type StringifyCache = ReturnType<typeof StringifyCache>
