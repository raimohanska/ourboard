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
import { WsWrapper } from "./ws-wrapper"

export type ConnectionHandlerParams = Readonly<{
    getSignedPutUrl: (key: string) => string
}>


export const connectionHandler = ({ getSignedPutUrl }: ConnectionHandlerParams) => (socket: WsWrapper) => {
    startSession(socket)
    socket.ws.addEventListener('error', e => { 
        //console.error("Web socket error", e);
        socket.ws.close() 
    });
    socket.ws.addEventListener('message', async str => { 
        const event = JSON.parse(str.data)
        let serialsToAck: Record<Id, Serial> = {}
        for (const e of event as AppEvent[]) {
            const serialAck = await handleAppEvent(socket, e, getSignedPutUrl)
            if (serialAck) {
                serialsToAck[serialAck.boardId] = serialAck.serial
            }
        }
        socket.send({"action": "ack"})
        Object.entries(serialsToAck).forEach(([boardId, serial]) => {
            socket.send({ action: "board.serial.ack", boardId, serial } as BoardSerialAck)
        })
    });

    socket.ws.addEventListener('close', () => {
        endSession(socket)
        getActiveBoards().forEach((state) => {
            delete state.cursorPositions[socket.id]
            state.cursorsMoved = true
        })
        releaseLocksFor(socket)
    });
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
    socket: WsWrapper,
    appEvent: AppEvent,
    getSignedPutUrl: (key: string) => string,
): Promise<{ boardId: Id; serial: Serial } | undefined> {
    if (isBoardItemEvent(appEvent)) {
        const boardId = appEvent.boardId
        const state = await getBoard(boardId)
        const gotLock = obtainLock(state.locks, appEvent, socket)
        if (gotLock) {
            if (isPersistableBoardItemEvent(appEvent)) {
                const session = getSession(socket)
                if (!session.isOnBoard(appEvent.boardId)) {
                    console.warn("Trying to send event to board without session")
                } else {
                    let historyEntry: BoardHistoryEntry = {
                        ...appEvent,
                        user: session.userInfo,
                        timestamp: new Date().toISOString(),
                    }
                    const serial = await updateBoards(historyEntry)
                    historyEntry = { ...historyEntry, serial }
                    broadcastBoardEvent(historyEntry, session)
                    if (appEvent.action === "board.rename") {
                        // special case: keeping name up to date as it's in a separate column
                        await updateBoard({ boardId: appEvent.boardId, name: appEvent.name })
                    }
                    return { boardId, serial }
                }
            }
        }
    } else {
        switch (appEvent.action) {
            case "board.join":
                //await sleep(3000) // simulate latency
                const board = await getBoard(appEvent.boardId)
                if (board.board.accessPolicy) {
                    const session = getSession(socket)
                    if (session.userInfo.userType != "authenticated") {
                        console.warn("Access denied to board by anonymous user")
                        session.sendEvent({
                            action: "board.join.denied",
                            boardId: appEvent.boardId,
                            reason: "unauthorized",
                        })
                        return
                    }
                    const email = session.userInfo.email
                    if (
                        !board.board.accessPolicy.allowList.some((entry) => {
                            if ("email" in entry) {
                                return entry.email === email
                            } else {
                                return email.endsWith(entry.domain)
                            }
                        })
                    ) {
                        console.warn("Access denied to board by user not on allowList")
                        session.sendEvent({
                            action: "board.join.denied",
                            boardId: appEvent.boardId,
                            reason: "forbidden",
                        })
                        return
                    }
                    await associateUserWithBoard(session.userInfo.userId, appEvent.boardId)
                }

                await addSessionToBoard(board, socket, appEvent.initAtSerial)
                return
            case "board.associate": {
                // TODO: maybe access check? Not security-wise necessary
                const session = getSession(socket)
                if (session.userInfo.userType !== "authenticated") {
                    console.warn("Trying to associate board without authenticated user")
                    return
                }
                const userId = session.userInfo.userId
                await associateUserWithBoard(userId, appEvent.boardId, appEvent.lastOpened)
                return
            }
            case "board.dissociate": {
                const session = getSession(socket)
                if (session.userInfo.userType !== "authenticated") {
                    console.warn("Trying to dissociate board without authenticated user")
                    return
                }
                const userId = session.userInfo.userId
                await dissociateUserWithBoard(userId, appEvent.boardId)
                return
            }
            case "board.add": {
                const { payload } = appEvent
                const board = !isFullyFormedBoard(payload)
                    ? { ...defaultBoardSize, ...payload, items: [], serial: 0 }
                    : payload
                await addBoard(board)
                return
            }
            case "cursor.move": {
                const { boardId, position } = appEvent
                const { x, y } = position
                const state = maybeGetBoard(boardId)
                if (state) {
                    const session = getSession(socket)
                    if (session.isOnBoard(appEvent.boardId)) {
                        state.cursorPositions[socket.id] = { x, y, sessionId: socket.id }
                        state.cursorsMoved = true
                    }
                }
                return
            }
            case "auth.login": {
                const success = await verifyGoogleTokenAndUserInfo(appEvent)
                const userId = await getUserIdForEmail(appEvent.email)
                const session = getSession(socket)
                if (success) {
                    const userInfo = await setVerifiedUserForSession(appEvent, session)
                    console.log(`${appEvent.name} logged in`)
                    session.sendEvent({ action: "auth.login.response", success, userId })
                    for (let board of session.boards) {
                        await associateUserWithBoard(userId, board.boardId)
                    }
                    session.sendEvent({
                        action: "user.boards",
                        email: appEvent.email,
                        boards: await getUserAssociatedBoards(userInfo),
                    })
                } else {
                    session.sendEvent({ action: "auth.login.response", success })
                }
                return
            }
            case "auth.logout": {
                const session = getSession(socket)
                if (session.userInfo.userType === "authenticated") {
                    logoutUser(appEvent, socket)
                    console.log(`${session.userInfo.name} logged out`)
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
                socket.send({ action: "asset.put.response", assetId, signedUrl } as AppEvent)
                return
            }
            default: {
                console.warn("Unhandled app-event message", appEvent)
            }
        }
    }
}
