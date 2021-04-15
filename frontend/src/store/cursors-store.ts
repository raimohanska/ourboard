import { ServerConnection } from "./server-connection"
import { CURSOR_POSITIONS_ACTION_TYPE, CursorPositions, UserCursorPosition, AppEvent } from "../../../common/src/domain"
import * as L from "lonna"
import { globalScope } from "lonna"
import { UserSessionStore } from "./user-session-store"

export function CursorsStore(connection: ServerConnection, sessionStore: UserSessionStore) {
    const cursors = connection.bufferedServerEvents.pipe(
        L.filter(isCursors),
        L.map((event) => {
            const otherCursors = { ...event.p }
            const session = sessionStore.sessionId.get()
            session && delete otherCursors[session] // Remove my own cursor. Server includes all because it's cheaper that way.
            const cursors = Object.values(otherCursors)
            return cursors
        }),
        L.toProperty([]),
        L.applyScope(globalScope),
    )
    let cursorsReceivedLast = 0
    const cursorDelay = cursors.pipe(
        L.map(() => {
            const now = new Date().getTime()
            const delay = cursorsReceivedLast ? now - cursorsReceivedLast : 0
            cursorsReceivedLast = now
            return delay
        }),
    )
    return {
        cursors,
        cursorDelay,
    }
}
export type CursorsStore = ReturnType<typeof CursorsStore>

function isCursors(e: AppEvent): e is CursorPositions {
    return e.action === CURSOR_POSITIONS_ACTION_TYPE
}
