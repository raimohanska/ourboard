import * as L from "lonna"
import { IndexeddbPersistence } from "y-indexeddb"
import { WebsocketProvider } from "y-websocket"
import * as Y from "yjs"
import { Id, PersistableBoardItemEvent, isTextItem } from "../../../common/src/domain"
import { getWebSocketRootUrl } from "./server-connection"

type BoardCRDT = ReturnType<typeof BoardCRDT>

function BoardCRDT(
    boardId: Id,
    online: L.Property<boolean>,
    localBoardItemEvents: L.EventStream<PersistableBoardItemEvent>,
) {
    const doc = new Y.Doc()

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

    function getField(itemId: Id, field: string) {
        return doc.getText(`items.${itemId}.${field}`)
    }

    localBoardItemEvents.forEach((event) => {
        if (event.action === "item.add") {
            for (const item of event.items) {
                if (isTextItem(item) && item.crdt) {
                    getField(item.id, "text").insert(0, item.text)
                }
            }
        }
    })

    return {
        doc,
        getField,
        awareness: provider.awareness,
    }
}

export type CRDTStore = ReturnType<typeof CRDTStore>

export function CRDTStore(online: L.Property<boolean>, localBoardItemEvents: L.EventStream<PersistableBoardItemEvent>) {
    const boards = new Map<Id, BoardCRDT>()
    function getBoardCrdt(boardId: Id): BoardCRDT {
        let doc = boards.get(boardId)
        if (!doc) {
            doc = BoardCRDT(boardId, online, localBoardItemEvents)
            boards.set(boardId, doc)
        }
        return doc
    }
    return {
        getBoardCrdt,
    }
}
