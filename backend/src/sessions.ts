import IO from "socket.io"
import {
    Board,
    ItemLocks,
    BoardItemEvent,
    CursorPosition,
    Id,
    CURSOR_POSITIONS_ACTION_TYPE,
    SetNickname,
    BoardWithHistory,
    EventUserInfo,
    BoardHistoryEntry,
    Serial,
} from "../../common/src/domain"
import { InitBoardNew, InitBoardDiff } from "../../common/src/domain"
import { randomProfession } from "./professions"
import { getBoardHistory, ServerSideBoardState } from "./board-store"

type UserSession = {
    socket: IO.Socket
    boards: Id[]
    nickname: string
}
const sessions: Record<string, UserSession> = {}

const everyoneOnTheBoard = (boardId: string) => Object.values(sessions).filter((s) => s.boards.includes(boardId))
const everyoneElseOnTheSameBoard = (boardId: Id, sender?: IO.Socket) =>
    Object.values(sessions).filter((s) => s.socket !== sender && s.boards.includes(boardId))

export function startSession(socket: IO.Socket, boards: Id[]) {
    sessions[socket.id] = { socket, boards, nickname: "Anonymous " + randomProfession() }
}
export function endSession(socket: IO.Socket) {
    const boards = sessions[socket.id].boards
    delete sessions[socket.id]
}
export function getSessionUserInfo(socket: IO.Socket): EventUserInfo {
    const nickname = sessions[socket.id].nickname
    return { userType: "unidentified", nickname }
}

async function createBoardInit(boardState: ServerSideBoardState, initAtSerial?: Serial): Promise<InitBoardNew | InitBoardDiff> {
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
    session.socket.send("app-event", await createBoardInit(boardState, initAtSerial))
    session.socket.send("app-event", {
        action: "board.join.ack",
        boardId: boardState.board.id,
        userId: session.socket.id,
        nickname: session.nickname,
    })
    everyoneOnTheBoard(boardState.board.id).forEach((s) => {
        session.socket.send("app-event", {
            action: "board.joined",
            boardId: boardState.board.id,
            userId: s.socket.id,
            nickname: s.nickname,
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
            session.nickname = event.nickname
            for (const boardId of session.boards) {
                everyoneElseOnTheSameBoard(boardId, origin).forEach((s) => s.socket.send("app-event", event))
            }
        })
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
            nickname: session.nickname,
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
    return function _broadcastItemLocks(boardId: Id, locks: Record<Id, ItemLocks>) {
        if (typeof timeouts[boardId] === "number") {
            return
        }
        timeouts[boardId] = setTimeout(() => {
            everyoneOnTheBoard(boardId).forEach((s) => {
                s.socket.send("app-event", { action: "board.locks", boardId, locks: locks[boardId] || {} })
            })
            timeouts[boardId] = undefined
        }, BROADCAST_DEBOUNCE_MS)
    }
})()
