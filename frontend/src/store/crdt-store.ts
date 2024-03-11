import * as L from "lonna"
import { IndexeddbPersistence } from "y-indexeddb"
import { WebsocketProvider } from "y-websocket"
import * as Y from "yjs"
import { augmentItemsWithCRDT, getCRDTField, importItemsIntoCRDT } from "../../../common/src/board-crdt-helper"
import { Id, Item, PersistableBoardItemEvent } from "../../../common/src/domain"
import { getWebSocketRootUrl } from "./server-connection"

type BoardCRDT = ReturnType<typeof BoardCRDT>
export type WebSocketPolyfill =
    | {
          new (url: string | URL, protocols?: string | string[] | undefined): WebSocket
          prototype: WebSocket
          readonly CLOSED: number
          readonly CLOSING: number
          readonly CONNECTING: number
          readonly OPEN: number
      }
    | undefined

function BoardCRDT(
    boardId: Id,
    online: L.Property<boolean>,
    localBoardItemEvents: L.EventStream<PersistableBoardItemEvent>,
    getSocketRoot: () => string,
    WebSocketPolyfill: WebSocketPolyfill,
) {
    const doc = new Y.Doc()

    function getField(itemId: Id, fieldName: string) {
        return getCRDTField(doc, itemId, fieldName)
    }

    function augmentItems(items: Item[]): Item[] {
        return augmentItemsWithCRDT(doc, items)
    }

    if (typeof indexedDB != "undefined") {
        const persistence = new IndexeddbPersistence(`b/${boardId}`, doc)

        persistence.on("synced", () => {
            console.log("CRDT data from indexedDB is loaded")
        })
    }

    const provider = new WebsocketProvider(`${getSocketRoot()}/socket/yjs`, `board/${boardId}`, doc, {
        connect: online.get(),
        WebSocketPolyfill,
    })

    const disconnected = L.bus()
    online.pipe(L.changes, L.takeUntil(disconnected)).forEach((c) => (c ? provider.connect() : provider.disconnect()))

    localBoardItemEvents
        .pipe(
            L.takeUntil(disconnected),
            L.filter((e) => e.boardId === boardId),
        )
        .forEach((event) => {
            if (event.action === "item.add") {
                importItemsIntoCRDT(doc, event.items, { fallbackToText: true })
            }
        })

    provider.on("status", (event: any) => {
        console.log("YJS Provider status", boardId, event.status)
    })

    function disconnect() {
        console.log("Disconnecting YJS provider for board", boardId)
        provider.destroy()
    }

    return {
        boardId,
        doc,
        getField,
        augmentItems,
        disconnect,
        awareness: provider.awareness,
    }
}

export type CRDTStore = ReturnType<typeof CRDTStore>

export function CRDTStore(
    currentBoardId: L.Property<Id | undefined>,
    online: L.Property<boolean>,
    localBoardItemEvents: L.EventStream<PersistableBoardItemEvent>,
    getSocketRoot: () => string = getWebSocketRootUrl,
    WebSocketPolyfill: WebSocketPolyfill = WebSocket as any,
) {
    let boardCrdt: BoardCRDT | undefined = undefined

    currentBoardId.forEach((boardId) => {
        if (boardCrdt && boardCrdt.boardId !== boardId) {
            boardCrdt.disconnect()
            boardCrdt = undefined
        }
    })

    function getBoardCrdt(boardId: Id): BoardCRDT {
        if (boardId != currentBoardId.get()) {
            throw Error(`Requested CRDT for board ${boardId} but current board is ${currentBoardId.get()}`)
        }

        if (!boardCrdt || boardCrdt.boardId !== boardId) {
            boardCrdt = BoardCRDT(boardId, online, localBoardItemEvents, getSocketRoot, WebSocketPolyfill)
        }
        return boardCrdt
    }

    function augmentItems(boardId: Id, items: Item[]): Item[] {
        if (!boardCrdt || boardCrdt.boardId !== boardId) {
            return items
        }
        return boardCrdt.augmentItems(items)
    }

    return {
        getBoardCrdt,
        augmentItems,
    }
}
