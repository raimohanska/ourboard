import IO from "socket.io"
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
    getSessionUserInfo,
    setVerifiedUserForSession,
    logoutUser,
} from "./sessions"
import { obtainLock, releaseLocksFor } from "./locker"
import { verifyGoogleTokenAndUserInfo } from "./google-token-verifier"

export type ConnectionHandlerParams = Readonly<{
    getSignedPutUrl: (key: string) => string
}>

export const connectionHandler = ({ getSignedPutUrl }: ConnectionHandlerParams) => (socket: IO.Socket) => {
    socket.on("message", async (kind: string, event: any, ackFn) => {
        // console.log("Received", kind, event)
        if (kind === "app-events") {
            let serialsToAck: Record<Id, Serial> = {}
            for (const e of event as AppEvent[]) {
                const serialAck = await handleAppEvent(socket, e, getSignedPutUrl)
                if (serialAck) {
                    serialsToAck[serialAck.boardId] = serialAck.serial
                }
            }
            Object.entries(serialsToAck).forEach(([boardId, serial]) => {
                socket.send("app-event", { action: "board.serial.ack", boardId, serial } as BoardSerialAck)
            })
            ackFn?.("ack")
            return
        }
        console.warn("Unhandled message", kind, event)
    })

    startSession(socket)

    socket.on("disconnect", () => {
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

async function handleAppEvent(
    socket: IO.Socket,
    appEvent: AppEvent,
    getSignedPutUrl: (key: string) => string,
): Promise<{ boardId: Id; serial: Serial } | undefined> {
    if (isBoardItemEvent(appEvent)) {
        const boardId = appEvent.boardId
        const state = await getBoard(boardId)
        const gotLock = obtainLock(state.locks, appEvent, socket)
        if (gotLock) {
            if (isPersistableBoardItemEvent(appEvent)) {
                const user = getSessionUserInfo(socket)
                let historyEntry: BoardHistoryEntry = { ...appEvent, user, timestamp: new Date().toISOString() }
                const serial = await updateBoards(historyEntry)
                historyEntry = { ...historyEntry, serial }
                broadcastBoardEvent(historyEntry, socket)
                return { boardId, serial }
            }
        }
    } else {
        switch (appEvent.action) {
            case "board.join":
                //await sleep(3000) // simulate latency
                const board = await getBoard(appEvent.boardId)
                await addSessionToBoard(board, socket, appEvent.initAtSerial)
                return
            case "board.add": {
                const { payload } = appEvent
                const board = !isFullyFormedBoard(payload)
                    ? { ...defaultBoardSize, ...payload, items: [], serial: 0 }
                    : payload
                const boardWithHistory = await addBoard(board)
                await addSessionToBoard(boardWithHistory, socket)
                return
            }
            case "cursor.move": {
                const { boardId, position } = appEvent
                const { x, y } = position
                const state = maybeGetBoard(boardId)
                if (state) {
                    state.cursorPositions[socket.id] = { x, y, sessionId: socket.id }
                    state.cursorsMoved = true
                }
                return
            }
            case "auth.login": {
                const loginSuccess = await verifyGoogleTokenAndUserInfo(appEvent)
                if (loginSuccess) {
                    setVerifiedUserForSession(appEvent, socket)
                    console.log(`${appEvent.name} logged in`)
                }
                return
            }
            case "auth.logout": {
                const user = getSessionUserInfo(socket)
                if (user.userType === "authenticated") {
                    logoutUser(appEvent, socket)
                    console.log(`${user.name} logged out`)
                }
                return
            }
            case "nickname.set": {
                setNicknameForSession(appEvent, socket)
                return
            }
            case "asset.put.request": {
                const { assetId } = appEvent
                const signedUrl = getSignedPutUrl(assetId)
                socket.send("app-event", { action: "asset.put.response", assetId, signedUrl } as AppEvent)
                return
            }
            default: {
                console.warn("Unhandled app-event message", appEvent)
            }
        }
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(() => resolve(undefined), ms))
}
