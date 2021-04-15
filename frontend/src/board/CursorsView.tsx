import { componentScope, h, ListView } from "harmaja"
import * as L from "lonna"
import { UserCursorPosition, UserSessionInfo } from "../../../common/src/domain"
import { CursorsStore } from "../store/cursors-store"

export const CursorsView = ({
    sessions,
    cursors,
}: {
    cursors: CursorsStore
    sessions: L.Property<UserSessionInfo[]>
}) => {
    const transition = cursors.cursorDelay.pipe(
        L.throttle(2000),
        L.applyScope(componentScope()),
        L.map((d) => `all ${(d / 1000).toFixed(1)}s`),
    )
    return (
        <ListView<UserCursorPosition, string>
            observable={cursors.cursors}
            renderObservable={(sessionId: string, pos: L.Property<UserCursorPosition>) => {
                const style = L.combineTemplate({
                    transition: transition,
                    left: L.view(
                        pos,
                        (p) => p.x,
                        (x) => x + "em",
                    ),
                    top: L.view(
                        pos,
                        (p) => p.y,
                        (y) => y + "em",
                    ),
                })
                return (
                    <span className="cursor" style={style}>
                        <span className="arrow" />
                        <span className="text">
                            {L.view(
                                sessions,
                                (sessions) => sessions.find((s) => s.sessionId === sessionId)?.nickname || null,
                            )}
                        </span>
                    </span>
                )
            }}
            getKey={(c: UserCursorPosition) => c.sessionId}
        />
    )
}
