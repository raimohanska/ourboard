import * as WebSocket from "ws"
import * as uuid from "uuid"

export const WsWrapper = (ws: WebSocket) => {
    return {
        send: (msg: any) => {
            try {
                ws.send(JSON.stringify(msg))
            } catch (e) {
                ws.close()
            }
        },
        ws,
        id: uuid.v4(),
    }
}
export type WsWrapper = ReturnType<typeof WsWrapper>
