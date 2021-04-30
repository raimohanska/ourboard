import { componentScope, h, ListView } from "harmaja"
import * as L from "lonna"
import { UserCursorPosition, UserSessionInfo } from "../../../common/src/domain"
import { CursorsStore } from "../store/cursors-store"
import { BoardZoom } from "./board-scroll-and-zoom"

export const CursorsView = ({
    sessions,
    cursors,
    zoom,
}: {
    cursors: CursorsStore
    sessions: L.Property<UserSessionInfo[]>
    zoom: L.Property<BoardZoom>
}) => {
    const transitionFromCursorDelay = cursors.cursorDelay.pipe(
        L.changes,
        L.throttle(2000, componentScope()),
        L.map((d) => `all ${(Math.min(d, 1000) / 1000).toFixed(1)}s`),
    )
    const transitionFromZoom = zoom.pipe(
        L.changes,
        L.map(() => "none"),
    )
    const transition = L.merge(transitionFromCursorDelay, transitionFromZoom).pipe(
        L.toProperty("none", componentScope()),
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
