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
    UserInfoUpdate,
    JoinedBoard,
    AckJoinBoard,
    AppEvent,
    UserCursorPosition,
} from "../../common/src/domain"
import { ServerSideBoardState } from "./board-state"
import { getBoardHistory } from "./board-store"
import { randomProfession } from "./professions"
import { sleep } from "./sleep"
type UserSession = {
    readonly sessionId: Id
    readonly boards: Id[]
    userInfo: EventUserInfo
    sendEvent: (event: AppEvent) => void
}

/*
socket: IO.Socket
    boards: Id[]
    userInfo: EventUserInfo
    */
export type SocketId = string

const sessions: Record<SocketId, UserSession> = {}

const everyoneOnTheBoard = (boardId: string) => Object.values(sessions).filter((s) => s.boards.includes(boardId))
const everyoneElseOnTheSameBoard = (boardId: Id, session?: UserSession) =>
    Object.values(sessions).filter((s) => s.sessionId !== session?.sessionId && s.boards.includes(boardId))

export function startSession(socket: IO.Socket) {
    sessions[socket.id] = userSession(socket)
}

function userSession(socket: IO.Socket) {
    function sendEvent(event: AppEvent) {
        socket.send("app-event", event)
    }
    const session = { 
        sessionId: socket.id, 
        userInfo: anonymousUser("Anonymous " + randomProfession()),
        boards: [],
        sendEvent
    }
    sessions[socket.id] = session
    return session
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
export function getSession(socket: IO.Socket): UserSession {
    return sessions[socket.id]
}

async function createBoardInit(
    boardState: ServerSideBoardState,
    initAtSerial?: Serial,
): Promise<InitBoardNew | InitBoardDiff> {
    if (initAtSerial) {
        const { items, ...boardAttributes } = boardState.board
        // TODO: Related to #142, in case of a re-join, events may be missed / sent out of order here.
        // The history is fetched asynchronously from the DB and may not contain latest events in memory. Also,
        // events occurring during the `await` will be sent to the client before the initialization here.
        const recentEvents = await getBoardHistory(boardState.board.id, initAtSerial)
        //await sleep(1000)
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
    session.sendEvent(await createBoardInit(boardState, initAtSerial))
    session.sendEvent({
        action: "board.join.ack",
        boardId: boardState.board.id,
        sessionId: session.sessionId,
        nickname: session.userInfo.nickname,
    } as AckJoinBoard)
    everyoneOnTheBoard(boardState.board.id).forEach((s) => {
        session.sendEvent({
            action: "board.joined",
            boardId: boardState.board.id,
            sessionId: s.sessionId,
            ...s.userInfo,
        } as JoinedBoard)
    })
    broadcastJoinEvent(boardState.board.id, session)
}

export function setNicknameForSession(event: SetNickname, origin: IO.Socket) {
    Object.values(sessions)
        .filter((s) => s.sessionId === origin.id)
        .forEach((session) => {
            session.userInfo =
                session.userInfo.userType === "unidentified"
                    ? anonymousUser(event.nickname)
                    : { ...session.userInfo, nickname: event.nickname }
            const updateInfo: UserInfoUpdate = {
                action: "userinfo.set",
                sessionId: session.sessionId,
                ...session.userInfo,
            }
            for (const boardId of session.boards) {
                everyoneElseOnTheSameBoard(boardId, session).forEach((s) => s.sendEvent(updateInfo))
            }
        })
}

export function setVerifiedUserForSession(event: AuthLogin, origin: IO.Socket) {
    const session = Object.values(sessions).find((s) => s.sessionId === origin.id)
    if (!session) {
        console.warn("Session not found for socket " + origin.id)
    } else {
        session.userInfo = { userType: "authenticated", nickname: event.name, name: event.name, email: event.email }
        for (const boardId of session.boards) {
            // TODO SECURITY: don't reveal authenticated emails to unidentified users on same board
            everyoneElseOnTheSameBoard(boardId, session).forEach((s) =>
                s.sendEvent({ ...event, token: "********" }),
            )
        }
    }
}

export function logoutUser(event: AuthLogout, origin: IO.Socket) {
    const session = Object.values(sessions).find((s) => s.sessionId === origin.id)
    if (!session) {
        console.warn("Session not found for socket " + origin.id)
    } else {
        session.userInfo = { userType: "unidentified", nickname: session.userInfo.nickname }
    }
}

export function broadcastBoardEvent(event: BoardHistoryEntry, origin?: UserSession) {
    //console.log("Broadcast", appEvent)
    everyoneElseOnTheSameBoard(event.boardId, origin).forEach((s) => {
        //console.log("   Sending to", s.socket.id)
        s.sendEvent(event)
    })
}

export function broadcastJoinEvent(boardId: Id, session: UserSession) {
    everyoneElseOnTheSameBoard(boardId, session).forEach((s) => {
        s.sendEvent({
            action: "board.joined",
            boardId,
            sessionId: session.sessionId,
            ...session.userInfo,
        } as JoinedBoard)
    })
}

export function broadcastCursorPositions(boardId: Id, positions: Record<Id, UserCursorPosition>) {
    everyoneOnTheBoard(boardId).forEach((s) => {
        s.sendEvent({ action: CURSOR_POSITIONS_ACTION_TYPE, p: positions })
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
                s.sendEvent({ action: "board.locks", boardId, locks })
            })
            timeouts[boardId] = undefined
        }, BROADCAST_DEBOUNCE_MS)
    }
})()
