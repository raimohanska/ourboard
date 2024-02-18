import * as awarenessProtocol from "y-protocols/dist/awareness.cjs"
import * as syncProtocol from "y-protocols/dist/sync.cjs"

import * as decoding from "lib0/decoding"
import * as encoding from "lib0/encoding"
import * as WebSocket from "ws"
import { Docs, DocsOptions } from "./Docs"
import { messageAwareness, messageSync } from "./Protocol"
import { WSSharedDoc } from "./WSSharedDoc"

const pingTimeout = 30000

export default class YWebSocketServer {
    docs: Docs
    constructor(options?: DocsOptions) {
        this.docs = new Docs(options)
    }

    setupWSConnection(conn: WebSocket, docName: string) {
        conn.binaryType = "arraybuffer"
        // get doc, initialize if it does not exist yet
        const doc = this.docs.getYDoc(docName)
        doc.addConnection(conn)
        // listen and reply to events
        conn.on("message", (message: ArrayBuffer) => messageListener(conn, doc, new Uint8Array(message)))

        // Check if connection is still alive
        let pongReceived = true
        const pingInterval = setInterval(() => {
            if (!pongReceived) {
                if (doc.hasConnection(conn)) {
                    doc.closeConn(conn)
                }
                clearInterval(pingInterval)
            } else if (doc.hasConnection(conn)) {
                pongReceived = false
                try {
                    conn.ping()
                } catch (e) {
                    doc.closeConn(conn)
                    clearInterval(pingInterval)
                }
            }
        }, pingTimeout)
        conn.on("close", () => {
            doc.closeConn(conn)
            clearInterval(pingInterval)
        })
        conn.on("pong", () => {
            pongReceived = true
        })
        // put the following in a variables in a block so the interval handlers don't keep in in
        // scope
        {
            // send sync step 1
            const encoder = encoding.createEncoder()
            encoding.writeVarUint(encoder, messageSync)
            syncProtocol.writeSyncStep1(encoder, doc)
            doc.send(conn, encoding.toUint8Array(encoder))
            const awarenessStates = doc.awareness.getStates()
            if (awarenessStates.size > 0) {
                const encoder = encoding.createEncoder()
                encoding.writeVarUint(encoder, messageAwareness)
                encoding.writeVarUint8Array(
                    encoder,
                    awarenessProtocol.encodeAwarenessUpdate(doc.awareness, Array.from(awarenessStates.keys())),
                )
                doc.send(conn, encoding.toUint8Array(encoder))
            }
        }
    }
}

const messageListener = (conn: WebSocket, doc: WSSharedDoc, message: Uint8Array) => {
    try {
        const encoder = encoding.createEncoder()
        const decoder = decoding.createDecoder(message)
        const messageType = decoding.readVarUint(decoder)
        switch (messageType) {
            case messageSync:
                encoding.writeVarUint(encoder, messageSync)
                syncProtocol.readSyncMessage(decoder, encoder, doc, conn)

                // If the `encoder` only contains the type of reply message and no
                // message, there is no need to send the message. When `encoder` only
                // contains the type of reply, its length is 1.
                if (encoding.length(encoder) > 1) {
                    doc.send(conn, encoding.toUint8Array(encoder))
                }
                break
            case messageAwareness: {
                awarenessProtocol.applyAwarenessUpdate(doc.awareness, decoding.readVarUint8Array(decoder), conn)
                break
            }
            default: {
                console.warn("Unexpected message type" + messageType)
            }
        }
    } catch (err) {
        console.error(err)
        doc.emit("error", [err])
    }
}
