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
        send: (buffer: Buffer) => {
            try {
                ws.send(buffer, { binary: false })
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

export function toBuffer(msg: EventFromServer) {
    return Buffer.from(JSON.stringify(msg))
}
