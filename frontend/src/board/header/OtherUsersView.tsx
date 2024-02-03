import { ListView, h } from "harmaja"
import * as L from "lonna"
import { Board, UserSessionInfo } from "../../../../common/src/domain"
import { Dispatch } from "../../store/board-store"
import { UserSessionState } from "../../store/user-session-store"
import { Rect } from "../../../../common/src/geometry"
import { assertNotNull } from "../../../../common/src/assertNotNull"

type OtherUsersViewProps = {
    usersOnBoard: L.Property<UserSessionInfo[]>
    dispatch: Dispatch
    state: L.Property<UserSessionState>
    board: L.Property<Board>
    viewRect: L.Property<Rect>
    online: L.Property<boolean>
}

export const OtherUsersView = ({ usersOnBoard, dispatch, state, online, board, viewRect }: OtherUsersViewProps) => {
    const status = L.view(online, usersOnBoard, (online, users) =>
        online ? (users.length > 1 ? "online-with-others" : "online-alone") : "offline",
    )
    return L.view(status, (status) => {
        if (status === "offline") {
            return (
                <div
                    className="offline-status"
                    title="Keep on working! Your work will be synchronized with others', once we are connected to the server again."
                >
                    Offline
                </div>
            )
        } else if (status === "online-alone") {
            return null
        }
        return (
            <div className="other-users">
                {L.view(usersOnBoard, (u) => u.length)} users
                <div className="pop-up">
                    <ul>
                        <li>
                            <a
                                onClick={() =>
                                    dispatch({
                                        action: "user.bringAllToMe",
                                        boardId: board.get().id,
                                        sessionId: assertNotNull(state.get().sessionId),
                                        viewRect: viewRect.get(),
                                        nickname: assertNotNull(state.get().nickname),
                                    })
                                }
                            >
                                Bring all to me
                            </a>
                        </li>
                        <ListView
                            observable={L.view(usersOnBoard, (users) =>
                                users.slice().sort((a, b) => a.nickname.localeCompare(b.nickname)),
                            )}
                            renderItem={(u) => (
                                <li className="user">
                                    {u.nickname}
                                    <span className="youlink">
                                        {u.sessionId === state.get().sessionId ? " (you)" : ""}
                                    </span>
                                </li>
                            )}
                        />
                    </ul>
                </div>
            </div>
        )
    })
}
