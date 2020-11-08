import IO from "socket.io"
import { Board, ItemLocks, BoardItemEvent, CursorPosition, Id, CURSOR_POSITIONS_ACTION_TYPE, SetNickname } from "../../common/src/domain"
import { randomProfession } from "./professions"

type UserSession = {
    socket: IO.Socket,
    boards: Id[],
    nickname: string
}
const sessions: Record<string, UserSession> = {}

const everyoneOnTheBoard = (boardId: string) => Object.values(sessions).filter(s => s.boards.includes(boardId))
const everyoneElseOnTheSameBoard = (boardId: Id, sender?: IO.Socket) => Object.values(sessions).filter(s => s.socket !== sender && s.boards.includes(boardId))

export function startSession(socket: IO.Socket, boards: Id[]) {
    sessions[socket.id] = { socket, boards, nickname: "Anonymous " + randomProfession() }
}
export function endSession(socket: IO.Socket) {
    const boards = sessions[socket.id].boards
    delete sessions[socket.id]
}
export function addSessionToBoard(board: Board, origin: IO.Socket) {
    Object.values(sessions)
        .filter(s => s.socket === origin)
        .forEach(session => {
            session.boards.push(board.id)
            session.socket.send("app-event", { action: "board.init", board })
            session.socket.send("app-event", { action: "board.join.ack", boardId: board.id, userId: session.socket.id, nickname: session.nickname })
            everyoneOnTheBoard(board.id).forEach(s => {
                session.socket.send("app-event", { action: "board.joined", boardId: board.id, userId: s.socket.id, nickname: s.nickname })
            })
            broadcastJoinEvent(board.id, session)    
        })
}

export function setNicknameForSession(event: SetNickname, origin: IO.Socket) {
    Object.values(sessions)
        .filter(s => s.socket === origin)
        .forEach(session => {
            if (session.socket.id !== event.userId) {
                console.warn("Trying to set nickname for other session")
                return
            }
            session.nickname = event.nickname
            for (const boardId of session.boards) {
                everyoneElseOnTheSameBoard(boardId, origin).forEach(s =>
                    s.socket.send("app-event", event)
                )
            }
        })
}

export function broadcastListEvent(appEvent: BoardItemEvent, origin?: IO.Socket) {
    //console.log("Broadcast", appEvent)
    everyoneElseOnTheSameBoard(appEvent.boardId, origin).forEach(s => {
        //console.log("   Sending to", s.socket.id)
        s.socket.send("app-event", appEvent)
    })
}

export function broadcastJoinEvent(boardId: Id, session: UserSession) {
    everyoneElseOnTheSameBoard(boardId, session.socket).forEach(s => {
        s.socket.send("app-event", { action: "board.joined", boardId, userId: session.socket.id, nickname: session.nickname })
    })
}

export function broadcastCursorPositions(boardId: Id, positions: Record<Id, CursorPosition>) {
    everyoneOnTheBoard(boardId).forEach(s => {
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
            everyoneOnTheBoard(boardId).forEach(s => {
                s.socket.send("app-event", { action: "board.locks", boardId, locks: locks[boardId] || {} })
            })
            timeouts[boardId] = undefined
        }, BROADCAST_DEBOUNCE_MS)
    }
})()
