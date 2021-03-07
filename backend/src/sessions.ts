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
    PersistableBoardItemEvent,
    isPersistableBoardItemEvent,
    isBoardHistoryEntry,
    EventUserInfoAuthenticated,
} from "../../common/src/domain"
import { ServerSideBoardState } from "./board-state"
import { getBoardHistory, verifyContinuity } from "./board-store"
import { randomProfession } from "./professions"
import { sleep } from "./sleep"
import { getUserIdForEmail } from "./user-store"
type UserSession = {
    readonly sessionId: Id
    readonly boards: UserSessionBoardEntry[]
    userInfo: EventUserInfo
    sendEvent: (event: AppEvent) => void
    isOnBoard(boardId: Id): boolean
    close(): void
}

type UserSessionBoardEntry = {
    boardId: Id
    status: "ready" | "buffering"
    bufferedEvents: BoardHistoryEntry[]
}

/*
socket: IO.Socket
    boards: Id[]
    userInfo: EventUserInfo
    */
export type SocketId = string

const sessions: Record<SocketId, UserSession> = {}
const isOnBoard = (boardId: Id) => (s: UserSession) => s.boards.some((b) => boardId === b.boardId)
const everyoneOnTheBoard = (boardId: string) => Object.values(sessions).filter(isOnBoard(boardId))
const everyoneElseOnTheSameBoard = (boardId: Id, session?: UserSession) =>
    Object.values(sessions).filter((s) => s.sessionId !== session?.sessionId && isOnBoard(boardId)(s))

export function startSession(socket: IO.Socket) {
    sessions[socket.id] = userSession(socket)
}

function userSession(socket: IO.Socket) {
    const boards: UserSessionBoardEntry[] = []
    const sessionId = socket.id
    function sendEvent(event: AppEvent) {
        if (isBoardHistoryEntry(event)) {
            const entry = boards.find((b) => b.boardId === event.boardId)
            if (!entry) throw Error("Board " + event.boardId + " not found for session " + sessionId)
            if (entry.status === "buffering") {
                entry.bufferedEvents.push(event)
                return
            }
        }
        socket.send("app-event", event)
    }
    const session = {
        sessionId,
        userInfo: anonymousUser("Anonymous " + randomProfession()),
        boards,
        sendEvent,
        isOnBoard: (boardId: Id) => boards.some((b) => b.boardId === boardId),
        close: () => socket.disconnect(),
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

export function terminateSessions() {
    Object.values(sessions).forEach((session) => session.close())
}

function describeRange(events: BoardHistoryEntry[]) {
    if (events.length === 0) return "[]"
    return `${events[0].serial}..${events[events.length - 1].serial}`
}

export async function addSessionToBoard(
    boardState: ServerSideBoardState,
    origin: IO.Socket,
    initAtSerial?: Serial,
): Promise<void> {
    const session = sessions[origin.id]
    if (!session) throw new Error("No session found for socket " + origin.id)
    const boardId = boardState.board.id
    if (initAtSerial) {
        const entry = { boardId, status: "buffering", bufferedEvents: [] } as UserSessionBoardEntry
        // 1. Add session to the board with "buffering" status, to collect all events that were meant to be sent during this async initialization
        session.boards.push(entry)
        try {
            const { items, serial, ...boardAttributes } = boardState.board

            //console.log(`Starting session at ${initAtSerial}`)
            // 2. capture all board events that haven't yet been flushed to the DB
            const inMemoryEvents = boardState.storingEvents
                .concat(boardState.recentEvents)
                .filter((e) => e.serial! > initAtSerial)

            // 3. Fetch events from DB
            // IMPORTANT NOTE: this is the only await here and must remain so, as the logic here depends on everything else being synchronous.
            console.log(`Loading board history for board ${boardState.board.id} session at serial ${initAtSerial}`)

            const dbEvents = await getBoardHistory(boardState.board.id, initAtSerial)
            console.log(`Got board history for board ${boardState.board.id} session at serial ${initAtSerial}`)

            //console.log(`Got history from DB: ${describeRange(dbEvents)} and in-memory: ${describeRange(inMemoryEvents)}`)
            // 4. Verify that all this makes for a consistent timeline
            verifyContinuity(boardId, initAtSerial, dbEvents, inMemoryEvents, entry.bufferedEvents)
            // 5. Send the initialization event containing all these events.
            session.sendEvent({
                action: "board.init",
                boardAttributes,
                recentEvents: [...dbEvents, ...inMemoryEvents, ...entry.bufferedEvents],
                initAtSerial,
            })
            //console.log(`Sending buffered events: ${describeRange(entry.bufferedEvents)}`)
            // 6. Set the client to "ready" status so that new events will be flushed
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
            })
        }
    } else {
        session.boards.push({ boardId, status: "ready", bufferedEvents: [] })
        session.sendEvent({
            action: "board.init",
            board: boardState.board,
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
            for (const boardId of session.boards.map((b) => b.boardId)) {
                everyoneElseOnTheSameBoard(boardId, session).forEach((s) => s.sendEvent(updateInfo))
            }
        })
}

export async function setVerifiedUserForSession(
    event: AuthLogin,
    session: UserSession,
): Promise<EventUserInfoAuthenticated> {
    const userId = await getUserIdForEmail(event.email)
    session.userInfo = { userType: "authenticated", nickname: event.name, name: event.name, email: event.email, userId }
    for (const boardId of session.boards.map((b) => b.boardId)) {
        // TODO SECURITY: don't reveal authenticated emails to unidentified users on same board
        everyoneElseOnTheSameBoard(boardId, session).forEach((s) => s.sendEvent({ ...event, token: "********" }))
    }
    return session.userInfo
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
