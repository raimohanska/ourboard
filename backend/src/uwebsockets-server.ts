import uws from "uWebSockets.js"
import { EventFromServer } from "../../common/src/domain"
import { StringifyCache } from "./ws-wrapper"
import * as uuid from "uuid"
import { connectionHandler, MessageHandler } from "./connection-handler"
import { handleBoardEvent } from "./board-event-handler"
import { createGetSignedPutUrl } from "./storage"
import { getConfig } from "./config"
import * as L from "lonna"
import { handleCommonEvent } from "./common-event-handler"

export const WsWrapper = (ws: uws.WebSocket) => {
    const errorE = L.bus<void>()
    const closeE = L.bus<void>()
    const msgE = L.bus<object>()

    const onError = (f: () => void) => {
        errorE.forEach(f)
    }
    const onMessage = (f: (msg: object) => void) => {
        msgE.forEach(f)
    }
    const onClose = (f: () => void) => {
        closeE.forEach(f)
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
        close: () => {
            ws.close()
            closeE.push()
        },
        errorE,
        closeE,
        msgE,
    }
}
type WsWrapper = ReturnType<typeof WsWrapper>

export function startUWebSocketsServer(port: number) {
    const config = getConfig()
    const app = uws.App()

    const sockets = new Map<uws.WebSocket, WsWrapper>()
    const textDecoder = new TextDecoder()

    mountWs("/socket/lobby", handleCommonEvent)
    // Currently unable to figure out the board id from path, that's the null below. That's not likely an issue as long as the clients use correct paths for sockets.
    mountWs("/socket/board/:boardId", handleBoardEvent(null, createGetSignedPutUrl(config.storageBackend)))

    app.get("/", (res) => res.writeStatus("200 OK").end("Sorry, we only serve websocket clients here."))

    function mountWs(path: string, handler: MessageHandler) {
        app.ws(path, {
            open: (ws) => {
                const wrapper = WsWrapper(ws)
                sockets.set(ws, wrapper)
                connectionHandler(wrapper, handler)
            },
            message: (ws, message, isBinary) => {
                if (isBinary) throw Error("Binary message")
                const object = JSON.parse(textDecoder.decode(message))
                const wrapper = sockets.get(ws)
                if (!wrapper) {
                    throw Error("Wrapper not found for socket " + ws)
                }
                wrapper.msgE.push(object)
            },
            close: (ws) => {
                const wrapper = sockets.get(ws)
                if (wrapper) {
                    wrapper.closeE.push()
                }
            },
        })
    }
    app.listen(port, () => {
        console.log("uWebSockets listening on " + port)
    })
}
