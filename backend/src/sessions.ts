import IO from "socket.io"
import { AppEvent, Board, Id, InitBoard, } from "../../common/domain"

type UserSession = {
    socket: IO.Socket,
    boards: Id[]
}
const sessions: Record<string, UserSession> = {}

export function startSession(socket: IO.Socket, boards: Id[]) {
    sessions[socket.id] = { socket, boards }
}
export function endSession(socket: IO.Socket) {
    delete sessions[socket.id]
}
export function addSessionToBoard(board: Board, origin: IO.Socket) {
    Object.values(sessions)
        .filter(s => s.socket === origin)
        .forEach(session => {
            session.boards.push(board.id)
            if (session.socket === origin) {
                session.socket.send("app-event", {action: "board.init", board: board} as InitBoard)
            }    
        })
}
export function broadcastListEvent(appEvent: AppEvent & { boardId: string }, origin?: IO.Socket) {
    //console.log("Broadcast", appEvent)
    Object.values(sessions).filter(s => s.socket !== origin && s.boards.includes(appEvent.boardId)).forEach(s => {
        //console.log("   Sending to", s.socket.id)
        s.socket.send("app-event", appEvent)
    })
}
