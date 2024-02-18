import * as Y from "yjs"

import * as awarenessProtocol from "y-protocols/dist/awareness.cjs"
import * as syncProtocol from "y-protocols/dist/sync.cjs"

import * as encoding from "lib0/encoding"
import { debounce } from "lodash"
import { messageAwareness, messageSync } from "./Protocol"
import { callbackHandler, isCallbackSet } from "./callbackHandler"
import * as WebSocket from "ws"
import { Docs } from "./Docs"

const CALLBACK_DEBOUNCE_WAIT = parseInt(process.env.CALLBACK_DEBOUNCE_WAIT ?? "") || 2000
const CALLBACK_DEBOUNCE_MAXWAIT = parseInt(process.env.CALLBACK_DEBOUNCE_MAXWAIT ?? "") || 10000

export const wsReadyStateConnecting = 0
export const wsReadyStateOpen = 1
export const wsReadyStateClosing = 2 // eslint-disable-line
export const wsReadyStateClosed = 3 // eslint-disable-line

export class WSSharedDoc extends Y.Doc {
    private docs: Docs
    readonly name: string
    private conns: Map<WebSocket, Set<number>> = new Map<WebSocket, Set<number>>()
    readonly awareness = new awarenessProtocol.Awareness(this)

    constructor(docs: Docs, name: string) {
        super({ gc: docs.gc })
        this.docs = docs
        this.name = name
        /**
         * Maps from conn to set of controlled user ids. Delete all user ids from awareness when this conn is closed
         */
        this.awareness.setLocalState(null)

        const awarenessChangeHandler = (
            { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
            conn: WebSocket,
        ) => {
            const changedClients = added.concat(updated, removed)
            if (conn !== null) {
                const connControlledIDs = this.conns.get(conn)
                if (connControlledIDs !== undefined) {
                    added.forEach((clientID) => {
                        connControlledIDs.add(clientID)
                    })
                    removed.forEach((clientID) => {
                        connControlledIDs.delete(clientID)
                    })
                }
            }
            // broadcast awareness update
            const encoder = encoding.createEncoder()
            encoding.writeVarUint(encoder, messageAwareness)
            encoding.writeVarUint8Array(
                encoder,
                awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients),
            )
            const buff = encoding.toUint8Array(encoder)
            this.conns.forEach((_, c) => {
                this.send(c, buff)
            })
        }
        this.awareness.on("update", awarenessChangeHandler)

        const updateHandler = (update: Uint8Array, origin: any, doc: WSSharedDoc) => {
            const encoder = encoding.createEncoder()
            encoding.writeVarUint(encoder, messageSync)
            syncProtocol.writeUpdate(encoder, update)
            const message = encoding.toUint8Array(encoder)
            doc.conns.forEach((_, conn) => this.send(conn, message))
        }

        this.on("update", updateHandler)
        if (isCallbackSet) {
            this.on("update", debounce(callbackHandler, CALLBACK_DEBOUNCE_WAIT, { maxWait: CALLBACK_DEBOUNCE_MAXWAIT }))
        }
    }

    send(conn: WebSocket, m: Uint8Array) {
        if (conn.readyState !== wsReadyStateConnecting && conn.readyState !== wsReadyStateOpen) {
            this.closeConn(conn)
        }
        try {
            conn.send(m, (err: any) => {
                err != null && this.closeConn(conn)
            })
        } catch (e) {
            console.error("Failed to send message to client. Closing connection.", e)
            this.closeConn(conn)
        }
    }

    closeConn(conn: WebSocket) {
        if (this.conns.has(conn)) {
            const controlledIds = this.conns.get(conn)!
            this.conns.delete(conn)
            awarenessProtocol.removeAwarenessStates(this.awareness, Array.from(controlledIds), null)
            if (this.conns.size === 0 && this.docs.persistence !== null) {
                // if persisted, we store state and destroy ydocument
                this.docs.persistence.writeState(this.name, this).then(() => {
                    this.destroy()
                })
                this.docs.deleteYDoc(this)
            }
        }
        conn.close()
    }

    addConnection(conn: WebSocket) {
        this.conns.set(conn, new Set())
    }

    hasConnection(conn: WebSocket) {
        return this.conns.has(conn)
    }
}
