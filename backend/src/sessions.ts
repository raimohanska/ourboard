import IO from "socket.io"
import {
    BoardHistoryEntry,
    CursorPosition,
    CURSOR_POSITIONS_ACTION_TYPE,
    EventUserInfo,
    Id,
    InitBoardDiff,
    InitBoardNew,
    ItemLocks,
    Serial,
    SetNickname,
    AuthLogin,
    AuthLogout,
} from "../../common/src/domain"
import { ServerSideBoardState } from "./board-state"
import { getBoardHistory } from "./board-store"
import { randomProfession } from "./professions"

type UserSession = {
    socket: IO.Socket
    boards: Id[]
    userInfo: EventUserInfo
}

export type SocketId = string

const sessions: Record<SocketId, UserSession> = {}

const everyoneOnTheBoard = (boardId: string) => Object.values(sessions).filter((s) => s.boards.includes(boardId))
const everyoneElseOnTheSameBoard = (boardId: Id, sender?: IO.Socket) =>
    Object.values(sessions).filter((s) => s.socket !== sender && s.boards.includes(boardId))

export function startSession(socket: IO.Socket) {
    sessions[socket.id] = { socket, boards: [], userInfo: anonymousUser("Anonymous " + randomProfession()) }
}

function anonymousUser(nickname: string): EventUserInfo {
    return { userType: "unidentified", nickname }
}

export function endSession(socket: IO.Socket) {
    const boards = sessions[socket.id].boards
    delete sessions[socket.id]
}
export function getBoardSessionCount(id: Id) {
    return everyoneOnTheBoard(id).length
}
export function getSessionUserInfo(socket: IO.Socket): EventUserInfo {
    return sessions[socket.id].userInfo
}

async function createBoardInit(
    boardState: ServerSideBoardState,
    initAtSerial?: Serial,
): Promise<InitBoardNew | InitBoardDiff> {
    if (initAtSerial) {
        const { items, ...boardAttributes } = boardState.board
        const recentEvents = await getBoardHistory(boardState.board.id, initAtSerial)
        return {
            action: "board.init",
            boardAttributes,
            recentEvents,
            initAtSerial,
        }
    } else {
        return {
            action: "board.init",
            board: boardState.board,
        }
    }
}

export async function addSessionToBoard(boardState: ServerSideBoardState, origin: IO.Socket, initAtSerial?: Serial) {
    const session = sessions[origin.id]
    if (!session) throw new Error("No session found for socket " + origin.id)
    session.boards.push(boardState.board.id)

    // TODO SECURITY: don't reveal authenticated emails to unidentified users on same board
    // TODO: what to include in joined events? Not just nickname, as we want to show who's identified (beside the cursor)
    session.socket.send("app-event", await createBoardInit(boardState, initAtSerial))
    session.socket.send("app-event", {
        action: "board.join.ack",
        boardId: boardState.board.id,
        userId: session.socket.id,
        nickname: session.userInfo.nickname,
    })
    everyoneOnTheBoard(boardState.board.id).forEach((s) => {
        session.socket.send("app-event", {
            action: "board.joined",
            boardId: boardState.board.id,
            userId: s.socket.id,
            nickname: s.userInfo.nickname,
        })
    })
    broadcastJoinEvent(boardState.board.id, session)
}

export function setNicknameForSession(event: SetNickname, origin: IO.Socket) {
    Object.values(sessions)
        .filter((s) => s.socket === origin)
        .forEach((session) => {
            if (session.socket.id !== event.userId) {
                console.warn("Trying to set nickname for other session")
                return
            }

            session.userInfo =
                session.userInfo.userType === "unidentified"
                    ? anonymousUser(event.nickname)
                    : { ...session.userInfo, nickname: event.nickname }
            for (const boardId of session.boards) {
                everyoneElseOnTheSameBoard(boardId, origin).forEach((s) => s.socket.send("app-event", event))
            }
        })
}

export function setVerifiedUserForSession(event: AuthLogin, origin: IO.Socket) {
    const session = Object.values(sessions).find((s) => s.socket === origin)
    if (!session) {
        console.warn("Session not found for socket " + origin.id)
    } else {
        session.userInfo = { userType: "authenticated", nickname: event.name, name: event.name, email: event.email }
        for (const boardId of session.boards) {
            // TODO SECURITY: don't reveal authenticated emails to unidentified users on same board
            everyoneElseOnTheSameBoard(boardId, origin).forEach((s) =>
                s.socket.send("app-event", { ...event, token: "********" }),
            )
        }
    }
}

export function logoutUser(event: AuthLogout, origin: IO.Socket) {
    const session = Object.values(sessions).find((s) => s.socket === origin)
    if (!session) {
        console.warn("Session not found for socket " + origin.id)
    } else {
        session.userInfo = { userType: "unidentified", nickname: session.userInfo.nickname }
    }
}

export function broadcastBoardEvent(event: BoardHistoryEntry, origin?: IO.Socket) {
    //console.log("Broadcast", appEvent)
    everyoneElseOnTheSameBoard(event.boardId, origin).forEach((s) => {
        //console.log("   Sending to", s.socket.id)
        s.socket.send("app-event", event)
    })
}

export function broadcastJoinEvent(boardId: Id, session: UserSession) {
    everyoneElseOnTheSameBoard(boardId, session.socket).forEach((s) => {
        s.socket.send("app-event", {
            action: "board.joined",
            boardId,
            userId: session.socket.id,
            nickname: session.userInfo,
        })
    })
}

export function broadcastCursorPositions(boardId: Id, positions: Record<Id, CursorPosition>) {
    everyoneOnTheBoard(boardId).forEach((s) => {
        s.socket.send("app-event", { action: CURSOR_POSITIONS_ACTION_TYPE, p: positions })
    })
}

const BROADCAST_DEBOUNCE_MS = 20

// Debounce by 20ms per board id, otherwise every item interaction (e.g. drag on 10 items, one event each) broadcasts locks
export const broadcastItemLocks = (() => {
    let timeouts: Record<Id, NodeJS.Timeout | undefined> = {}
    const hasActiveTimer = (boardId: string) => timeouts[boardId] !== undefined

    return function _broadcastItemLocks(boardId: string, locks: ItemLocks) {
        if (hasActiveTimer(boardId)) {
            return
        }
        timeouts[boardId] = setTimeout(() => {
            everyoneOnTheBoard(boardId).forEach((s) => {
                s.socket.send("app-event", { action: "board.locks", boardId, locks })
            })
            timeouts[boardId] = undefined
        }, BROADCAST_DEBOUNCE_MS)
    }
})()
