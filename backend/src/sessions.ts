import IO from "socket.io"
import { Board, BoardItemEvent, CursorPosition, Id, CURSOR_POSITIONS_ACTION_TYPE } from "../../common/domain"

type UserSession = {
    socket: IO.Socket,
    boards: Id[]
}
const sessions: Record<string, UserSession> = {}

const everyoneOnTheBoard = (boardId: string) => Object.values(sessions).filter(s => s.boards.includes(boardId))
const everyoneElseOnTheSameBoard = (boardId: Id, sender?: IO.Socket) => Object.values(sessions).filter(s => s.socket !== sender && s.boards.includes(boardId))

export function startSession(socket: IO.Socket, boards: Id[]) {
    sessions[socket.id] = { socket, boards }
}
export function endSession(socket: IO.Socket): Id[] {
    const boards = sessions[socket.id].boards
    delete sessions[socket.id]
    return boards
}
export function addSessionToBoard(board: Board, origin: IO.Socket) {
    Object.values(sessions)
        .filter(s => s.socket === origin)
        .forEach(session => {
            session.boards.push(board.id)
            if (session.socket === origin) {
                session.socket.send("app-event", { action: "board.init", board })
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

export function broadcastJoinEvent(boardId: Id, user: IO.Socket) {
    everyoneElseOnTheSameBoard(boardId, user).forEach(s => {
        s.socket.send("app-event", { action: "board.joined", boardId, userId: user.id })
    })
}

export function broadcastCursorPositions(boardId: Id, positions: Record<Id, CursorPosition>) {
    everyoneOnTheBoard(boardId).forEach(s => {
        s.socket.send("app-event", { action: CURSOR_POSITIONS_ACTION_TYPE, p: positions })
    })
}

export function ackJoinBoard(boardId: Id, user: IO.Socket) {
    user.send("app-event", { action: "board.join.ack", boardId, userId: user.id })
}


