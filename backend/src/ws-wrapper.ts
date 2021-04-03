import * as WebSocket from "ws"
import * as uuid from "uuid"
import { EventFromServer } from "../../common/src/domain"

export const WsWrapper = (ws: WebSocket) => {
    return {
        send: (msg: EventFromServer, cache?: StringifyCache) => {
            try {
                ws.send(cache ? cache.stringify(msg) : JSON.stringify(msg))
            } catch (e) {
                ws.close()
            }
        },
        ws,
        id: uuid.v4(),
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
