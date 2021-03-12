import * as WebSocket from "ws"
import * as uuid from "uuid"
import { EventFromServer } from "../../common/src/domain"

export const WsWrapper = (ws: WebSocket) => {
    return {
        send: (msg: EventFromServer) => {
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
