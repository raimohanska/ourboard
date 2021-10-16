import {
    BoardHistoryEntry,
    CursorPosition,
    CURSOR_POSITIONS_ACTION_TYPE,
    UnidentifiedUserInfo,
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
    EventFromServer,
    isPersistableBoardItemEvent,
    isBoardHistoryEntry,
    EventUserInfoAuthenticated,
    getBoardAttributes,
    AccessLevel,
    SessionUserInfo,
} from "../../common/src/domain"
import { getBoard, maybeGetBoard, ServerSideBoardState } from "./board-state"
import { getBoardHistory, verifyContinuity } from "./board-store"
import { randomProfession } from "./professions"
import { sleep } from "../../common/src/sleep"
import { getUserIdForEmail } from "./user-store"
import { StringifyCache, WsWrapper } from "./ws-wrapper"

export type UserSession = {
    readonly sessionId: Id
    boardSession: UserSessionBoardEntry | null
    userInfo: SessionUserInfo
    sendEvent: (event: EventFromServer, cache?: StringifyCache) => void
    isOnBoard: (boardId: Id) => boolean
    close(): void
}

export type UserSessionBoardEntry = {
    boardId: Id
    status: "ready" | "buffering"
    accessLevel: AccessLevel
    bufferedEvents: BoardHistoryEntry[]
}

/*
socket: WsWrapper
    boards: Id[]
    userInfo: EventUserInfo
    */
export type SocketId = string

const sessions: Record<SocketId, UserSession> = {}

const everyoneOnTheBoard = (boardId: string) => {
    const boardState = maybeGetBoard(boardId)
    if (!boardState) {
        console.warn(`Trying to send to a board not in memory: ${boardId}`)
        return []
    }
    return boardState.sessions
}
const sendTo = (recipients: UserSession[], message: EventFromServer) => {
    const cache = StringifyCache()
    recipients.forEach((c) => c.sendEvent(message, cache))
}
const everyoneElseOnTheSameBoard = (boardId: Id, session?: UserSession) =>
    everyoneOnTheBoard(boardId).filter((s) => s !== session)

export function startSession(socket: WsWrapper) {
    sessions[socket.id] = userSession(socket)
}

function userSession(socket: WsWrapper): UserSession {
    const sessionId = socket.id
    function sendEvent(event: EventFromServer, cache?: StringifyCache) {
        if (isBoardHistoryEntry(event)) {
            const entry = session.boardSession
            if (!entry) throw Error("Board " + event.boardId + " not found for session " + sessionId)
            if (entry.status === "buffering") {
                entry.bufferedEvents.push(event)
                return
            }
        }
        socket.send(event, cache)
    }
    const session: UserSession = {
        sessionId,
        userInfo: anonymousUser("Anonymous " + randomProfession()),
        boardSession: null,
        sendEvent,
        isOnBoard: (boardId: Id) => session.boardSession != null && session.boardSession.boardId === boardId,
        close: () => socket.close(),
    }
    sessions[socket.id] = session
    return session
}

function anonymousUser(nickname: string): UnidentifiedUserInfo {
    return { userType: "unidentified", nickname }
}

export function endSession(socket: WsWrapper) {
    const sessionId = socket.id
    const session = sessions[sessionId]
    if (!session) {
        console.warn(`Ending non-existing session ${sessionId}`)
        return
    }
    if (session.boardSession) {
        const boardState = maybeGetBoard(session.boardSession.boardId)
        if (boardState) {
            boardState.sessions = boardState.sessions.filter((s) => s.sessionId !== sessionId)
        } else {
            console.warn(`Board state not found when ending session: ${session.boardSession.boardId}`)
        }
    }
    delete sessions[socket.id]
}
export function getBoardSessionCount(id: Id) {
    return everyoneOnTheBoard(id).length
}
export function getSession(socket: WsWrapper): UserSession | undefined {
    return sessions[socket.id]
}

export function terminateSessions() {
    Object.values(sessions).forEach((session) => session.close())
}

function describeRange(events: BoardHistoryEntry[]) {
    if (events.length === 0) return "[]"
    return `${events[0].serial}..${events[events.length - 1].serial}`
}

export async function addSessionToBoard(
    boardState: ServerSideBoardState,
    origin: WsWrapper,
    accessLevel: AccessLevel,
    initAtSerial?: Serial,
): Promise<void> {
    const session = sessions[origin.id]
    if (!session) throw new Error("No session found for socket " + origin.id)
    const boardId = boardState.board.id
    boardState.sessions = [...boardState.sessions, session]
    if (initAtSerial) {
        const entry: UserSessionBoardEntry = { boardId, status: "buffering", accessLevel, bufferedEvents: [] }
        // 1. Add session to the board with "buffering" status, to collect all events that were meant to be sent during this async initialization
        session.boardSession = entry
        try {
            const boardAttributes = getBoardAttributes(boardState.board, session.userInfo)

            //console.log(`Starting session at ${initAtSerial}`)
            // 2. capture all board events that haven't yet been flushed to the DB
            const inMemoryEvents = boardState.storingEvents
                .concat(boardState.recentEvents)
                .filter((e) => e.serial! > initAtSerial)

            // 3. Fetch events from DB as chunks
            // IMPORTANT NOTE: this is the only await here and must remain so, as the logic here depends on everything else being synchronous.
            console.log(`Loading board history for board ${boardState.board.id} session at serial ${initAtSerial}`)
            let first = true
            await getBoardHistory(boardState.board.id, initAtSerial, (chunk) => {
                // Send a chunk of events with done: false, so that client knows to wait for more
                session.sendEvent({
                    action: "board.init.diff",
                    first,
                    last: false,
                    boardAttributes,
                    recentEvents: chunk,
                    initAtSerial,
                    accessLevel,
                })
                first = false
            })

            console.log(`Got board history for board ${boardState.board.id} session at serial ${initAtSerial}`)

            // 4. Send the last chunk containing both the inMemoryEvents and the buffered events (done: true)
            // In memory events: not yet flushed to DB when query was made
            // Buffered events: events that occurred after the in memory events were captured
            session.sendEvent({
                action: "board.init.diff",
                boardAttributes,
                first,
                last: true,
                recentEvents: [...inMemoryEvents, ...entry.bufferedEvents],
                initAtSerial,
                accessLevel,
            })

            // 5. Set the client to "ready" status so that new events will be flushed
            entry.status = "ready"
            entry.bufferedEvents = []
        } catch (e) {
            console.warn(
                `Failed to bootstrap client on board ${boardId} at serial ${initAtSerial}. Sending full state.`,
            )
            entry.status = "ready"
            entry.bufferedEvents = []
            session.sendEvent({
                action: "board.init",
                board: boardState.board,
                accessLevel,
            })
        }
    } else {
        session.boardSession = { boardId, status: "ready", accessLevel, bufferedEvents: [] }
        session.sendEvent({
            action: "board.init",
            board: boardState.board,
            accessLevel,
        })
    }

    // TODO SECURITY: don't reveal authenticated emails to unidentified users on same board
    // TODO: what to include in joined events? Not just nickname, as we want to show who's identified (beside the cursor)

    session.sendEvent({
        action: "board.join.ack",
        boardId: boardState.board.id,
        sessionId: session.sessionId,
        nickname: session.userInfo.nickname,
    } as AckJoinBoard)

    // Notify new user of existing users
    everyoneOnTheBoard(boardState.board.id).forEach((s) => {
        session.sendEvent({
            action: "board.joined",
            boardId: boardState.board.id,
            sessionId: s.sessionId,
            ...s.userInfo,
        } as JoinedBoard)
    })

    // Notify existing users of new user
    broadcastJoinEvent(boardState.board.id, session)
}

export function setNicknameForSession(event: SetNickname, origin: WsWrapper) {
    const session = getSession(origin)
    if (!session) {
        console.warn(`Session not found: ${origin.id}`)
        return
    }

    session.userInfo =
        session.userInfo.userType === "unidentified"
            ? anonymousUser(event.nickname)
            : { ...session.userInfo, nickname: event.nickname }
    const updateInfo: UserInfoUpdate = {
        action: "userinfo.set",
        sessionId: session.sessionId,
        ...session.userInfo,
    }
    if (session.boardSession) {
        sendTo(everyoneElseOnTheSameBoard(session.boardSession.boardId, session), updateInfo)
    }
}

export async function setVerifiedUserForSession(
    event: AuthLogin,
    session: UserSession,
): Promise<EventUserInfoAuthenticated> {
    const userId = await getUserIdForEmail(event.email)
    session.userInfo = {
        userType: "authenticated",
        nickname: event.name,
        name: event.name,
        email: event.email,
        picture: event.picture,
        userId,
    }
    if (session.boardSession) {
        // TODO SECURITY: don't reveal authenticated emails to unidentified users on same board
        sendTo(everyoneElseOnTheSameBoard(session.boardSession.boardId, session), { ...event, token: "********" })
    }
    return session.userInfo
}

export function logoutUser(event: AuthLogout, origin: WsWrapper) {
    const session = getSession(origin)
    if (!session) {
        console.warn("Session not found for socket " + origin.id)
    } else {
        session.userInfo = { userType: "unidentified", nickname: session.userInfo.nickname }
    }
}

export function broadcastBoardEvent(event: BoardHistoryEntry, origin?: UserSession) {
    //console.log("Broadcast", event.action, "to", everyoneElseOnTheSameBoard(event.boardId, origin).length)
    sendTo(everyoneElseOnTheSameBoard(event.boardId, origin), event)
}

export function broadcastJoinEvent(boardId: Id, session: UserSession) {
    sendTo(everyoneElseOnTheSameBoard(boardId, session), {
        action: "board.joined",
        boardId,
        sessionId: session.sessionId,
        ...session.userInfo,
    } as JoinedBoard)
}

export function broadcastCursorPositions(boardId: Id, positions: Record<Id, UserCursorPosition>) {
    sendTo(everyoneOnTheBoard(boardId), { action: CURSOR_POSITIONS_ACTION_TYPE, p: positions })
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
            sendTo(everyoneOnTheBoard(boardId), { action: "board.locks", boardId, locks })
            timeouts[boardId] = undefined
        }, BROADCAST_DEBOUNCE_MS)
    }
})()

export function getSessionCount() {
    return Object.values(sessions).length
}
