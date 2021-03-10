import * as WebSocket from "ws";
import * as uuid from "uuid"

export const WsWrapper = (ws: WebSocket) => {
    return {
        send: (msg: any) => ws.send(JSON.stringify(msg)),
        ws,
        id: uuid.v4()
    }
}
export type WsWrapper = ReturnType<typeof WsWrapper>