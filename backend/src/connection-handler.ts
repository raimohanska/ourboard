import {
    AppEvent,
    isBoardItemEvent,
    isPersistableBoardItemEvent,
    defaultBoardSize,
    isFullyFormedBoard,
    Serial,
    BoardHistoryEntry,
    Id,
    BoardSerialAck,
} from "../../common/src/domain"
import { addBoard, getActiveBoards, getBoard, maybeGetBoard, updateBoards } from "./board-state"
import {
    addSessionToBoard,
    broadcastBoardEvent,
    endSession,
    startSession,
    broadcastCursorPositions,
    setNicknameForSession,
    getSession,
    setVerifiedUserForSession,
    logoutUser,
} from "./sessions"
import { obtainLock, releaseLocksFor } from "./locker"
import { verifyGoogleTokenAndUserInfo } from "./google-token-verifier"
import { updateBoard } from "./board-store"
import {
    associateUserWithBoard,
    dissociateUserWithBoard,
    getUserAssociatedBoards,
    getUserIdForEmail,
} from "./user-store"
import { WsWrapper } from "./ws-wrapper"

export type ConnectionHandlerParams = Readonly<{
    getSignedPutUrl: (key: string) => string
}>

export const connectionHandler = (socket: WsWrapper, handleMessage: MessageHandler) => {
    startSession(socket)
    socket.ws.addEventListener("error", (e) => {
        //console.error("Web socket error", e);
        socket.ws.close()
    })
    socket.ws.addEventListener("message", async (str) => {
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
