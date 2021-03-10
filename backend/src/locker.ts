import { Id, BoardItemEvent, isPersistableBoardItemEvent, getItemIds, ItemLocks } from "../../common/src/domain"
import { getActiveBoards, ServerSideBoardState } from "./board-state"
import { AutoExpiringMap } from "./expiring-map"
import { WsWrapper } from "./ws-wrapper"

const LOCK_TTL_SECONDS = 10

export function Locks(onChange: (locks: ItemLocks) => any) {
    const locks = AutoExpiringMap<string>(LOCK_TTL_SECONDS).onChange(onChange)

    return {
        lockItem: (itemId: Id, sessionId: Id) => {
            if (locks.has(itemId) && locks.get(itemId) !== sessionId) {
                return false
            }

            locks.set(itemId, sessionId)
            return true
        },
        unlockItem: (itemId: Id, sessionId: Id) => {
            if (locks.get(itemId) === sessionId) {
                return locks.delete(itemId)
            }

            return false
        },
        delete: (itemId: string) => locks.delete(itemId),
        entries: () => locks.entries(),
    }
}

export function obtainLock(locks: ServerSideBoardState["locks"], e: BoardItemEvent, socket: WsWrapper) {
    if (isPersistableBoardItemEvent(e)) {
        const itemIds = getItemIds(e)
        // Since we are operating on multiple items at a time, locking must succeed for all of them
        // for the action to succeed
        return itemIds.every((id) => locks.lockItem(id, socket.id))
    } else {
        const { itemId, action } = e
        switch (action) {
            case "item.lock":
                return locks.lockItem(itemId, socket.id)
            case "item.unlock":
                return locks.unlockItem(itemId, socket.id)
        }
    }
}

export function releaseLocksFor(socket: WsWrapper) {
    getActiveBoards().forEach((state) => {
        const locks = state.locks
        for (const [itemId, sessionId] of locks.entries()) {
            if (socket.id === sessionId) {
                locks.delete(itemId)
            }
        }
    })
}
