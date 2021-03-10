import { AppEvent, BoardSerialAck, Id, Serial } from "../../common/src/domain"
import { getActiveBoards } from "./board-state"
import { releaseLocksFor } from "./locker"
import { broadcastCursorPositions, endSession, startSession } from "./sessions"
import { WsWrapper } from "./ws-wrapper"

export type ConnectionHandlerParams = Readonly<{
    getSignedPutUrl: (key: string) => string
}>

export const connectionHandler = (socket: WsWrapper, handleMessage: MessageHandler) => {
    startSession(socket)
    socket.ws.addEventListener("error", () => {
        //console.error("Web socket error", e);
        socket.ws.close()
    })
    socket.ws.addEventListener("message", async (str: any) => {
        const event = JSON.parse(str.data)
        let serialsToAck: Record<Id, Serial> = {}
        for (const e of event as AppEvent[]) {
            const serialAck = await handleMessage(socket, e)
            if (serialAck === true) {
            } else if (serialAck === false) {
                console.warn("Unhandled app-event message", e)
            } else {
                serialsToAck[serialAck.boardId] = serialAck.serial
            }
        }
        socket.send({ action: "ack" })
        Object.entries(serialsToAck).forEach(([boardId, serial]) => {
            socket.send({ action: "board.serial.ack", boardId, serial } as BoardSerialAck)
        })
    })

    socket.ws.addEventListener("close", () => {
        endSession(socket)
        getActiveBoards().forEach((state) => {
            delete state.cursorPositions[socket.id]
            state.cursorsMoved = true
        })
        releaseLocksFor(socket)
    })
}

setInterval(() => {
    getActiveBoards().forEach((bh) => {
        if (bh.cursorsMoved) {
            broadcastCursorPositions(bh.board.id, bh.cursorPositions)
            bh.cursorsMoved = false
        }
    })
}, 100)

export type MessageHandler = (socket: WsWrapper, appEvent: AppEvent) => Promise<MessageHandlerResult>
export type MessageHandlerResult = { boardId: Id; serial: Serial } | boolean
