import * as L from "lonna"
import * as uuid from "uuid"
import { IndexeddbPersistence } from "y-indexeddb"
import { WebsocketProvider } from "y-websocket"
import * as Y from "yjs"
import { Board, Id, Item, PersistableBoardItemEvent, QuillDelta, isTextItem } from "../../../common/src/domain"
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
        return doc.getText(`items.${itemId}.${fieldName}`)
    }

    localBoardItemEvents.pipe(L.filter((e) => e.boardId === boardId)).forEach((event) => {
        if (event.action === "item.add") {
            for (const item of event.items) {
                if (isTextItem(item) && item.crdt) {
                    if (item.textAsDelta) {
                        getField(item.id, "text").applyDelta(item.textAsDelta)
                    } else {
                        getField(item.id, "text").insert(0, item.text)
                    }
                }
            }
        }
    })

    function augmentItems(items: Item[]): Item[] {
        return items.map((item) => {
            if (isTextItem(item) && item.crdt) {
                const textAsDelta = getField(item.id, "text").toDelta() as QuillDelta
                return { ...item, textAsDelta }
            }
            return item
        })
    }

    function importItems(items: Item[]) {
        for (const item of items) {
            if (isTextItem(item) && item.crdt) {
                if (item.textAsDelta) {
                    getField(item.id, "text").applyDelta(item.textAsDelta)
                } else {
                    throw Error("textAsDelta is missing ")
                }
            }
        }
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

    online.onChange((c) => (c ? provider.connect() : provider.disconnect()))

    provider.on("status", (event: any) => {
        console.log("YJS Provider status", event.status)
    })

    return {
        doc,
        getField,
        augmentItems,
        importItems,
        awareness: provider.awareness,
    }
}

export type CRDTStore = ReturnType<typeof CRDTStore>

export function CRDTStore(
    online: L.Property<boolean>,
    localBoardItemEvents: L.EventStream<PersistableBoardItemEvent>,
    getSocketRoot: () => string = getWebSocketRootUrl,
    WebSocketPolyfill: WebSocketPolyfill = WebSocket as any,
) {
    const boards = new Map<Id, BoardCRDT>()
    function getBoardCrdt(boardId: Id): BoardCRDT {
        let boardCrdt = boards.get(boardId)
        if (!boardCrdt) {
            boardCrdt = BoardCRDT(boardId, online, localBoardItemEvents, getSocketRoot, WebSocketPolyfill)
            boards.set(boardId, boardCrdt)
        }
        return boardCrdt
    }

    function augmentItems(boardId: Id, items: Item[]): Item[] {
        const boardCrdt = boards.get(boardId)
        if (!boardCrdt) {
            throw Error("Assertion failed: board not found")
        }
        return boardCrdt.augmentItems(items)
    }

    function cloneBoard(board: Board): Board {
        const boardCrdt = boards.get(board.id)
        if (!boardCrdt) {
            throw Error("Assertion failed: board not found")
        }

        const newId = uuid.v4()
        const items = boardCrdt.augmentItems(Object.values(board.items))
        const newBoard = {
            ...board,
            items: Object.fromEntries(items.map((i) => [i.id, i])),
            id: newId,
        }

        const newBoardCrdt = getBoardCrdt(newId)
        newBoardCrdt.importItems(items)
        return newBoard
    }

    return {
        getBoardCrdt,
        augmentItems,
        cloneBoard,
    }
}
