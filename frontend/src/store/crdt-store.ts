import * as L from "lonna"
import { IndexeddbPersistence } from "y-indexeddb"
import { WebsocketProvider } from "y-websocket"
import * as Y from "yjs"
import { Id, Item, PersistableBoardItemEvent, QuillDelta, isTextItem } from "../../../common/src/domain"
import { getWebSocketRootUrl } from "./server-connection"
import { Dispatch } from "./board-store"

type BoardCRDT = ReturnType<typeof BoardCRDT>

function BoardCRDT(
    boardId: Id,
    online: L.Property<boolean>,
    localBoardItemEvents: L.EventStream<PersistableBoardItemEvent>,
    dispatch: Dispatch,
) {
    const doc = new Y.Doc()

    function getField(itemId: Id, fieldName: string) {
        return doc.getText(`items.${itemId}.${fieldName}`)
    }

    localBoardItemEvents.forEach((event) => {
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

    const persistence = new IndexeddbPersistence(`b/${boardId}`, doc)

    persistence.on("synced", () => {
        console.log("CRDT data from indexedDB is loaded")
    })

    const provider = new WebsocketProvider(`${getWebSocketRootUrl()}/socket/yjs`, `board/${boardId}`, doc, {
        connect: online.get(),
    })

    online.onChange((c) => (c ? provider.connect() : provider.disconnect()))

    provider.on("status", (event: any) => {
        console.log("YJS Provider status", event.status)
    })

    return {
        doc,
        getField,
        augmentItems,
        awareness: provider.awareness,
    }
}

export type CRDTStore = ReturnType<typeof CRDTStore>

export function CRDTStore(
    online: L.Property<boolean>,
    localBoardItemEvents: L.EventStream<PersistableBoardItemEvent>,
    dispatch: Dispatch,
) {
    const boards = new Map<Id, BoardCRDT>()
    function getBoardCrdt(boardId: Id): BoardCRDT {
        let boardCrdt = boards.get(boardId)
        if (!boardCrdt) {
            boardCrdt = BoardCRDT(boardId, online, localBoardItemEvents, dispatch)
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

    return {
        getBoardCrdt,
        augmentItems,
    }
}
