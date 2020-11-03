import IO from "socket.io"
import { ItemLocks, exampleBoard, Id, BoardItemEvent, isPersistableBoardItemEvent } from "../../common/domain"
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

export function obtainLock(e: BoardItemEvent, socket: IO.Socket, cb: () => any) {
    if (isPersistableBoardItemEvent(e)) {        
        const itemIds = "items" in e ? (e.items as { id: string }[] ).map(i => i.id) : e.itemIds
        for (let id of itemIds) {
            lockItem(e.boardId, id, socket.id) && cb()
        }
    } else {
        const { boardId, itemId, action } = e
        switch(action) {
            case "item.lock":
                lockItem(boardId, itemId, socket.id) && cb()
                break
            case "item.unlock":
                unlockItem(boardId, itemId, socket.id) && cb()
                break
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