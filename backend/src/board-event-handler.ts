import { AppEvent, BoardHistoryEntry, Id, isBoardItemEvent, isPersistableBoardItemEvent } from "../../common/src/domain"
import { getBoard, maybeGetBoard, updateBoards } from "./board-state"
import { updateBoard } from "./board-store"
import { MessageHandlerResult } from "./connection-handler"
import { handleCommonEvent } from "./common-event-handler"
import { obtainLock } from "./locker"
import { addSessionToBoard, broadcastBoardEvent, getSession } from "./sessions"
import { associateUserWithBoard } from "./user-store"
import { WsWrapper } from "./ws-wrapper"

export const handleBoardEvent = (allowedBoardId: Id, getSignedPutUrl: (key: string) => string) => async (
    socket: WsWrapper,
    appEvent: AppEvent,
): Promise<MessageHandlerResult> => {
    if (await handleCommonEvent(socket, appEvent)) return true
    if (isBoardItemEvent(appEvent)) {
        const boardId = appEvent.boardId
        const state = await getBoard(boardId)
        const gotLock = obtainLock(state.locks, appEvent, socket)
        if (gotLock) {
            if (isPersistableBoardItemEvent(appEvent)) {
                const session = getSession(socket)
                if (!session || !session.isOnBoard(appEvent.boardId)) {
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
                if (appEvent.boardId !== allowedBoardId) {
                    console.warn(`Trying to join board ${appEvent.boardId} on socket for board ${allowedBoardId}`)
                    return true
                }
                const board = await getBoard(appEvent.boardId)
                if (board.board.accessPolicy) {
                    const session = getSession(socket)
                    if (!session) {
                        return true
                    }
                    if (session.userInfo.userType != "authenticated") {
                        console.warn("Access denied to board by anonymous user")
                        session.sendEvent({
                            action: "board.join.denied",
                            boardId: appEvent.boardId,
                            reason: "unauthorized",
                        })
                        return true
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
                        return true
                    }
                    await associateUserWithBoard(session.userInfo.userId, appEvent.boardId)
                }
                await addSessionToBoard(board, socket, appEvent.initAtSerial)
                return true

            case "cursor.move": {
                const { boardId, position } = appEvent
                const { x, y } = position
                const state = maybeGetBoard(boardId)
                if (state) {
                    const session = getSession(socket)
                    if (session && session.isOnBoard(appEvent.boardId)) {
                        state.cursorPositions[socket.id] = { x, y, sessionId: socket.id }
                        state.cursorsMoved = true
                    }
                }
                return true
            }
            case "asset.put.request": {
                const { assetId } = appEvent
                const signedUrl = getSignedPutUrl(assetId)
                socket.send({ action: "asset.put.response", assetId, signedUrl } as AppEvent)
                return true
            }
        }
    }
    return false
}
