import expressWs from "express-ws"
import * as Y from "yjs"
import { updateBoardCrdt } from "./board-state"
import { getBoardHistoryCrdtUpdates } from "./board-store"
import { withDBClient } from "./db"
import { getSessionIdFromCookies } from "./http-session"
import { getSessionById } from "./websocket-sessions"
import YWebSocketServer from "./y-websocket-server/YWebSocketServer"

export function BoardYJSServer(ws: expressWs.Instance, path: string) {
    const yWebSocketServer = new YWebSocketServer({
        persistence: {
            bindState: async (docName, ydoc) => {
                const boardId = docName
                await withDBClient(async (client) => {
                    console.log(`Loading CRDT updates from DB for board ${boardId}`)
                    const updates = await getBoardHistoryCrdtUpdates(client, boardId)
                    for (const update of updates) {
                        Y.applyUpdate(ydoc, update)
                    }
                    console.log(`Loaded ${updates.length} CRDT updates from DB for board ${boardId}`)
                })
                ydoc.on("update", (update: Uint8Array, origin: any, doc: Y.Doc) => {
                    updateBoardCrdt(boardId, update)
                })
            },
            writeState: async (docName, ydoc) => {
                // TODO: needed?
            },
        },
    })

    ws.app.ws(path, async (socket, req) => {
        const boardId = req.params.boardId
        const sessionId = getSessionIdFromCookies(req)
        const session = sessionId ? getSessionById(sessionId) : undefined
        if (!session) {
            //console.warn("No session for YJS connection for board", boardId)
            socket.close()
            return
        }
        console.log("Got YJS connection for board", boardId)
        const docName = boardId
        try {
            await yWebSocketServer.setupWSConnection(socket, docName)
        } catch (e) {
            console.error("Error setting up YJS connection", e)
            socket.close()
        }
    })
}
