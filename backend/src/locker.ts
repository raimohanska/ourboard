import IO from "socket.io"
import { ItemLocks, exampleBoard, Id, BoardItemEvent, isPersistableBoardItemEvent, getItemIds } from "../../common/src/domain"
import { broadcastItemLocks } from "./sessions"

const locks: Record<Id, ItemLocks> = {
    [exampleBoard.id]: {}
}

const LOCK_TTL_SECONDS = 10
const lockTTL = new Map()

function lockItem(boardId: Id, itemId: Id, userId: Id) {
    locks[boardId] = locks[boardId] || {}

    if (locks[boardId][itemId] && locks[boardId][itemId] !== userId) {
        return false
    }

    if (!locks[boardId][itemId]) {
        locks[boardId][itemId] = userId
        broadcastItemLocks(boardId, locks)
    }

    renewLease(boardId, itemId)

    return true
}

function unlockItem(boardId: Id, itemId: Id, userId: Id) {
    locks[boardId] = locks[boardId] || {}
    
    if (locks[boardId][itemId] === userId) {
        delete locks[boardId][itemId]
        broadcastItemLocks(boardId, locks)
        return true
    }

    return false
}

function renewLease(boardId: Id, itemId: Id) {
    if (lockTTL.has(itemId)) {
        clearTimeout(lockTTL.get(itemId))
    }

    lockTTL.set(itemId, setTimeout(() => {
        locks[boardId] = locks[boardId] || {}
        delete locks[boardId][itemId]
        broadcastItemLocks(boardId, locks)
    }, LOCK_TTL_SECONDS * 1000))
}

export function obtainLock(e: BoardItemEvent, socket: IO.Socket) {
    if (isPersistableBoardItemEvent(e)) {        
        const itemIds = getItemIds(e)
        // Since we are operating on multiple items at a time, locking must succeed for all of them
        // for the action to succeed
        return itemIds.every(id => lockItem(e.boardId, id, socket.id))
    } else {
        const { boardId, itemId, action } = e
        switch(action) {
            case "item.lock":
                return lockItem(boardId, itemId, socket.id)
            case "item.unlock":
                return unlockItem(boardId, itemId, socket.id)
        }
    }
}

export function releaseLocksFor(socket: IO.Socket) {
    Object.keys(locks).forEach(boardId => {
        for (const [itemId, userId] of Object.entries(locks[boardId])) {
            if (socket.id === userId) {
                delete locks[boardId][itemId]
            }
        }
        broadcastItemLocks(boardId, locks)
    })
}