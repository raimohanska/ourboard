import IO from "socket.io"
import {
    AppEvent,
    isBoardItemEvent,
    isPersistableBoardItemEvent,
    defaultBoardSize,
    isFullyFormedBoard,
    Serial,
    BoardHistoryEntry,
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
} from "./sessions"
import { obtainLock, releaseLocksFor } from "./locker"

export type ConnectionHandlerParams = Readonly<{
    getSignedPutUrl: (key: string) => string
}>

export const connectionHandler = ({ getSignedPutUrl }: ConnectionHandlerParams) => (socket: IO.Socket) => {
    socket.on("message", async (kind: string, event: any, ackFn) => {
        // console.log("Received", kind, event)
        if (kind === "app-events") {
            const serials: (Serial | undefined)[] = []
            for (const e of event as AppEvent[]) {
                serials.push(await handleAppEvent(socket, e, getSignedPutUrl))
            }
            ackFn?.(serials)
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
): Promise<Serial | undefined> {
    if (isBoardItemEvent(appEvent)) {
        const gotLock = obtainLock(appEvent, socket)
        if (gotLock) {
            if (isPersistableBoardItemEvent(appEvent)) {
                const user = getSessionUserInfo(socket)
                let historyEntry: BoardHistoryEntry = { ...appEvent, user, timestamp: new Date().toISOString() }
                const serial = await updateBoards(historyEntry)
                historyEntry = { ...historyEntry, serial }
                broadcastBoardEvent(historyEntry, socket)
                return serial
            }
        }
    } else {
        switch (appEvent.action) {
            case "board.join":
                const board = await getBoard(appEvent.boardId)
                await addSessionToBoard(board, socket, appEvent.initAtSerial)
                return
            case "board.add": {
                const { payload } = appEvent
                const board = !isFullyFormedBoard(payload) ? { ...defaultBoardSize, ...payload, items: [] } : payload
                const boardWithHistory = await addBoard(board)
                await addSessionToBoard(boardWithHistory, socket)
                return
            }
            case "cursor.move": {
                const { boardId, position } = appEvent
                const { x, y } = position
                const state = maybeGetBoard(boardId)
                if (state) {
                    state.cursorPositions[socket.id] = { x, y, userId: socket.id }
                    state.cursorsMoved = true
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
