import { ServerConnection } from "./server-connection";
import { CURSOR_POSITIONS_ACTION_TYPE, CursorPositions, UserCursorPosition, AppEvent } from "../../../common/src/domain"
import * as L from "lonna"
import { globalScope } from "lonna";
import { UserSessionStore } from "./user-session-store";

export function CursorsStore(connection: ServerConnection, sessionStore: UserSessionStore) {
    const initialState = [] as UserCursorPosition[]
    const cursors = connection.bufferedServerEvents.pipe(
        L.filter(isCursors), 
        L.map(event => {
            const otherCursors = { ...event.p }
            const session = sessionStore.sessionId.get()
            session && delete otherCursors[session] // Remove my own cursor. Server includes all because it's cheaper that way.
            const cursors = Object.values(otherCursors)
            return cursors
    
        }),
        L.toProperty([]),
        L.applyScope(globalScope)
    )
    return {
        cursors
    }
}
export type CursorsStore = ReturnType<typeof CursorsStore>

function isCursors(e: AppEvent): e is CursorPositions {
    return e.action === CURSOR_POSITIONS_ACTION_TYPE
}