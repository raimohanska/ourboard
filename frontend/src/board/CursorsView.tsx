import { componentScope, h, ListView } from "harmaja"
import * as L from "lonna"
import { UserCursorPosition, UserSessionInfo } from "../../../common/src/domain"
import { CursorsStore } from "../store/cursors-store"
import { BoardZoom } from "./board-scroll-and-zoom"
import { Rect } from "../../../common/src/geometry"
import _ from "lodash"

export const CursorsView = ({
    sessions,
    cursors,
    viewRect,
}: {
    cursors: CursorsStore
    sessions: L.Property<UserSessionInfo[]>
    viewRect: L.Property<Rect>
}) => {
    const transitionFromCursorDelay = cursors.cursorDelay.pipe(
        L.changes,
        L.throttle(2000, componentScope()),
        L.map((d) => {
            const t = (Math.min(d, 1000) / 1000).toFixed(1)
            return `all ${t}s, top ${t}s`
        }),
    )
    const transitionFromZoom = viewRect.pipe(
        L.changes,
        L.map(() => "none"),
    )
    const transition = L.merge(transitionFromCursorDelay, transitionFromZoom).pipe(
        L.toProperty("none", componentScope()),
    )

    const scope = componentScope()

    return (
        <ListView<UserCursorPosition, string>
            observable={cursors.cursors}
            renderObservable={(sessionId: string, pos_: L.Property<UserCursorPosition>) => {
                const pos = pos_.pipe(L.skipDuplicates(_.isEqual), L.applyScope(scope))
                const changes = pos.pipe(L.changes)
                const stale = L.merge(
                    changes.pipe(
                        L.debounce(1000),
                        L.map(() => true),
                    ),
                    changes.pipe(L.map(() => false)),
                ).pipe(L.toProperty(false, scope))
                const className = L.view(stale, (s) => (s ? "cursor stale" : "cursor"))
                const style = L.view(pos, transition, viewRect, (p, t, vr) => {
                    const x = _.clamp(p.x, vr.x, vr.x + vr.width - 1)
                    const y = _.clamp(p.y, vr.y, vr.y + vr.height - 1)
                    return {
                        transition: t,
                        left: x + "em",
                        top: y + "em",
                    }
                })
                const userInfo = L.view(sessions, (sessions) => {
                    const session = sessions.find((s) => s.sessionId === sessionId)
                    return {
                        name: session ? session.nickname : null,
                        picture: session && session.userType === "authenticated" ? <img src={session.picture} /> : null,
                    }
                })

                return (
                    <span className={className} style={style}>
                        <span className="arrow" />
                        <span className="userInfo">
                            {L.view(userInfo, "picture")}
                            <span className="text">{L.view(userInfo, "name")}</span>
                        </span>
                    </span>
                )
            }}
            getKey={(c: UserCursorPosition) => c.sessionId}
        />
    )
}
