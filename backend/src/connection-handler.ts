import IO from "socket.io"
import { AppEvent, BoardItemEvent, BoardCursorPositions, exampleBoard, Id } from "../../common/domain"
import { addBoard, getActiveBoards, getBoard, updateBoards } from "./board-store"
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



const cursorPositions: Record<Id, BoardCursorPositions> = {
    [exampleBoard.id]: {}
}

setInterval(() => {
    getActiveBoards().forEach(b => {
        cursorPositions[b.id] && broadcastCursorPositions(b.id, cursorPositions[b.id] )
    })
}, 30);

async function handleAppEvent(socket: IO.Socket, appEvent: AppEvent) {
    if (appEvent.action.startsWith("item.")) {
        await updateBoards(appEvent as BoardItemEvent)
        broadcastListEvent(appEvent as BoardItemEvent, socket)
    } else {
        switch (appEvent.action) {
            case "board.join": 
                addSessionToBoard(await getBoard(appEvent.boardId), socket)
                ackJoinBoard(appEvent.boardId, socket)
                return;
            case "board.add": {
                const board = { id: appEvent.boardId, name: appEvent.name, items: [] }
                addBoard(board)
                addSessionToBoard(board, socket)
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
}