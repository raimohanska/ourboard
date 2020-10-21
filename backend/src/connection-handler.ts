import IO from "socket.io"
import { AppEvent, Board, BoardCursorPositions, exampleBoard, Id } from "../../common/domain"
import { boardReducer } from "../../common/state"
import { addSessionToBoard, broadcastListEvent, endSession, ackJoinBoard, startSession, broadcastCursorPositions } from "./sessions"

export const connectionHandler = (socket: IO.Socket) => {        
    socket.on("message", async (kind: string, event: any, ackFn) => {
        // console.log("Received", kind, event)
        if (kind === "app-event") {
            ackFn?.("ack")
            return await handleAppEvent(socket, event as AppEvent)  
        }
        console.warn("Unhandled message", kind, event)
    })

    startSession(socket, [])

    socket.on("disconnect", () => {
        const boards = endSession(socket)
        boards.forEach(b => {
            cursorPositions[b] && (delete cursorPositions[b][socket.id])
        })
    })
}

let boards: Board[] = [
    exampleBoard
]

const cursorPositions: Record<Id, BoardCursorPositions> = {
    [exampleBoard.id]: {}
}

setInterval(() => {
    boards.forEach(b => {
        cursorPositions[b.id] && broadcastCursorPositions(b.id, cursorPositions[b.id] )
    })
}, 30);

function getBoard(id: Id): Board {
    const board = boards.find(b => b.id === id)
    if (!board) {
        throw Error(`Board ${id} not found`)
    }
    return board
}

async function handleAppEvent(socket: IO.Socket, appEvent: AppEvent) {
    switch (appEvent.action) {
        case "board.join": 
            addSessionToBoard(getBoard(appEvent.boardId), socket)
            ackJoinBoard(appEvent.boardId, socket)
            return;
        case "board.add": {
            const board = { id: appEvent.boardId, name: appEvent.name, items: [] }
            boards.push(board)
            addSessionToBoard(board, socket)
            return
        }
        case "item.add":
        case "item.update": {
            boards = boards.map(board => board.id === appEvent.boardId ? boardReducer(board, appEvent) : board)
            broadcastListEvent(appEvent, socket)
            return
        }
        case "cursor.move": {
            const { boardId, position } = appEvent;
            const { x, y } = position;
            cursorPositions[boardId] = cursorPositions[boardId] || {};
            cursorPositions[boardId][socket.id] = { x, y };
            return;
        }
        default: {
            console.warn("Unhandled app-event message", appEvent)
        }
    }
}