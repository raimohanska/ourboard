import IO from "socket.io"
import {
    ItemLocks,
    exampleBoard,
    Id,
    BoardItemEvent,
    isPersistableBoardItemEvent,
    getItemIds,
} from "../../common/src/domain"
import { getActiveBoards, maybeGetBoard } from "./board-state"
import { broadcastItemLocks } from "./sessions"

const LOCK_TTL_SECONDS = 10
const lockTTL = new Map()

function lockItem(boardId: Id, itemId: Id, userId: Id) {
    const state = maybeGetBoard(boardId)
    if (!state) return false
    const locks = state.locks

    if (locks[itemId] && locks[itemId] !== userId) {
        return false
    }

    if (!locks[itemId]) {
        locks[itemId] = userId
        broadcastItemLocks(state)
    }

    renewLease(boardId, itemId)

    return true
}

function unlockItem(boardId: Id, itemId: Id, userId: Id) {
    const state = maybeGetBoard(boardId)
    if (!state) return false
    const locks = state.locks

    if (locks[itemId] === userId) {
        delete locks[itemId]
        broadcastItemLocks(state)
        return true
    }

    return false
}

function renewLease(boardId: Id, itemId: Id) {
    if (lockTTL.has(itemId)) {
        clearTimeout(lockTTL.get(itemId))
    }

    lockTTL.set(
        itemId,
        setTimeout(() => {
            lockTTL.delete(itemId)
            const state = maybeGetBoard(boardId)
            if (!state) return false
            const locks = state.locks
            if (locks[boardId]) {
                delete locks[itemId]
            }
            broadcastItemLocks(state)
        }, LOCK_TTL_SECONDS * 1000),
    )
}

export function obtainLock(e: BoardItemEvent, socket: IO.Socket) {
    if (isPersistableBoardItemEvent(e)) {
        const itemIds = getItemIds(e)
        // Since we are operating on multiple items at a time, locking must succeed for all of them
        // for the action to succeed
        return itemIds.every((id) => lockItem(e.boardId, id, socket.id))
    } else {
        const { boardId, itemId, action } = e
        switch (action) {
            case "item.lock":
                return lockItem(boardId, itemId, socket.id)
            case "item.unlock":
                return unlockItem(boardId, itemId, socket.id)
        }
    }
}

export function releaseLocksFor(socket: IO.Socket) {
    getActiveBoards().forEach((state) => {
        const locks = state.locks
        for (const [itemId, userId] of Object.entries(locks)) {
            if (socket.id === userId) {
                delete locks[itemId]
            }
        }
        broadcastItemLocks(state)
    })
}
