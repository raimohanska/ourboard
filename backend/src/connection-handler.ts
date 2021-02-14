import IO from "socket.io"
import {
    AppEvent,
    isBoardItemEvent,
    isPersistableBoardItemEvent,
    BoardCursorPositions,
    exampleBoard,
    Id,
    defaultBoardSize,
    isFullyFormedBoard,
    Serial,
    BoardHistoryEntry,
} from "../../common/src/domain"
import { addBoard, getActiveBoards, getBoard, updateBoards } from "./board-store"
import {
    addSessionToBoard,
    broadcastBoardEvent,
    endSession,
    startSession,
    broadcastCursorPositions,
    broadcastItemLocks,
    setNicknameForSession,
    getSessionUserInfo,
} from "./sessions"
import { getSignedPutUrl } from "./storage"
import { obtainLock, releaseLocksFor } from "./locker"

export const connectionHandler = (socket: IO.Socket) => {
    socket.on("message", async (kind: string, event: any, ackFn) => {
        // console.log("Received", kind, event)
        if (kind === "app-events") {
            const serials: (Serial | undefined)[] = []
            for (const e of event as AppEvent[]) {
                serials.push(await handleAppEvent(socket, e))
            }
            ackFn?.(serials)
            return
        }
        console.warn("Unhandled message", kind, event)
    })

    startSession(socket, [])

    socket.on("disconnect", () => {
        endSession(socket)
        Object.keys(cursorPositions).forEach((boardId) => {
            delete cursorPositions[boardId][socket.id]
            positionShouldBeFlushedToClients.add(boardId)
        })
        releaseLocksFor(socket)
    })
}

const positionShouldBeFlushedToClients = new Set()
const cursorPositions: Record<Id, BoardCursorPositions> = {
    [exampleBoard.id]: {},
}

setInterval(() => {
    getActiveBoards().forEach((bh) => {
        const b = bh.board
        if (!cursorPositions[b.id] || !positionShouldBeFlushedToClients.has(b.id)) {
            return
        }
        broadcastCursorPositions(b.id, cursorPositions[b.id])
        positionShouldBeFlushedToClients.delete(b.id)
    })
}, 100)

async function handleAppEvent(socket: IO.Socket, appEvent: AppEvent): Promise<Serial | undefined> {
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
                cursorPositions[boardId] = cursorPositions[boardId] || {}
                cursorPositions[boardId][socket.id] = { x, y, userId: socket.id }
                positionShouldBeFlushedToClients.add(boardId)
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
