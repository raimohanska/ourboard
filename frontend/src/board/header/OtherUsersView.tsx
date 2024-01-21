import { ListView, h } from "harmaja"
import * as L from "lonna"
import { Board, UserSessionInfo } from "../../../../common/src/domain"
import { Dispatch } from "../../store/board-store"
import { UserSessionState } from "../../store/user-session-store"
import { Rect } from "../../../../common/src/geometry"

type OtherUsersViewProps = {
    usersOnBoard: L.Property<UserSessionInfo[]>
    dispatch: Dispatch
    state: L.Property<UserSessionState>
    board: L.Property<Board>
    viewRect: L.Property<Rect>
}

export const OtherUsersView = ({ usersOnBoard, dispatch, state, board, viewRect }: OtherUsersViewProps) => {
    return L.view(
        usersOnBoard,
        (u) => (u.length > 1 ? u : null),
        (u) => {
            if (!u) return null
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
                                observable={usersOnBoard}
                                renderItem={(u) => <li className="user">{u.nickname}</li>}
                            />
                        </ul>
                    </div>
                </div>
            )
        },
    )
}

function assertNotNull<T>(x: T | null | undefined): T {
    if (x === null || x === undefined) throw Error("Assertion failed: " + x)
    return x
}
