import IO from "socket.io"
import { Id, BoardItemEvent, isPersistableBoardItemEvent, getItemIds, ItemLocks } from "../../common/src/domain"
import { getActiveBoards, ServerSideBoardState } from "./board-state"
import { AutoExpiringMap } from "./expiring-map"

const LOCK_TTL_SECONDS = 10

export function Locks(onChange: (locks: ItemLocks) => any) {
    const locks = AutoExpiringMap<string>(LOCK_TTL_SECONDS).onChange(onChange)

    return {
        lockItem: (itemId: Id, userId: Id) => {
            if (locks.has(itemId) && locks.get(itemId) !== userId) {
                return false
            }

            locks.set(itemId, userId)
            return true
        },
        unlockItem: (itemId: Id, userId: Id) => {
            if (locks.get(itemId) === userId) {
                return locks.delete(itemId)
            }

            return false
        },
        delete: (itemId: string) => locks.delete(itemId),
        entries: () => locks.entries(),
    }
}

export function obtainLock(locks: ServerSideBoardState["locks"], e: BoardItemEvent, socket: IO.Socket) {
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

export function releaseLocksFor(socket: IO.Socket) {
    getActiveBoards().forEach((state) => {
        const locks = state.locks
        for (const [itemId, userId] of locks.entries()) {
            if (socket.id === userId) {
                locks.delete(itemId)
            }
        }
    })
}
