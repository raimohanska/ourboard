import { AppEvent, Id, Serial, EventWrapper } from "../../common/src/domain"
import { getActiveBoards } from "./board-state"
import { releaseLocksFor } from "./locker"
import { broadcastCursorPositions, endSession, startSession } from "./sessions"
import { WsWrapper } from "./ws-wrapper"

export type ConnectionHandlerParams = Readonly<{
    getSignedPutUrl: (key: string) => string
}>

export const connectionHandler = (socket: WsWrapper, handleMessage: MessageHandler) => {
    startSession(socket)
    socket.onError(() => {
        socket.close()
    })
    socket.onMessage(async (o: object) => {
        try {
            let event = o as EventWrapper
            let serialsToAck: Record<Id, Serial> = {}
            for (const e of event.events) {
                const serialAck = await handleMessage(socket, e)
                if (serialAck === true) {
                } else if (serialAck === false) {
                    console.warn("Unhandled app-event message", e)
                } else {
                    serialsToAck[serialAck.boardId] = serialAck.serial
                }
            }
            if (event.ackId) {
                socket.send({ action: "ack", ackId: event.ackId, serials: serialsToAck })
            }
        } catch (e) {
            console.error("Error while handling event from client. Closing connection.", e)
            socket.close()
        }
    })

    socket.onClose(() => {
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
