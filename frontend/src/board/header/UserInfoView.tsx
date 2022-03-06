import { componentScope, h } from "harmaja"
import * as L from "lonna"
import { UserSessionInfo } from "../../../../common/src/domain"
import { UserIcon } from "../../components/Icons"
import { BoardState, Dispatch } from "../../store/board-store"
import { UserSessionState } from "../../store/user-session-store"
import { UserInfoModal } from "./UserInfoModal"

export const UserInfoView = ({
    state,
    dispatch,
    usersOnBoard,
    modalContent,
}: {
    state: L.Property<UserSessionState>
    usersOnBoard: L.Property<UserSessionInfo[]>
    dispatch: Dispatch
    modalContent: L.Atom<any>
}) => {
    const pictureURL = L.view(state, (s) => (s.status === "logged-in" ? s.picture : undefined))
    usersOnBoard
        .pipe(
            L.map((users) => users.length),
            L.changes,
            L.filter((l) => l > 1),
            L.takeUntil(L.later(5000, null)),
            L.take(1),
            L.applyScope(componentScope()),
        )
        .forEach(() => {
            if (!state.get().nicknameSetByUser) {
                showDialog()
            }
        })

    function dismiss() {
        modalContent.set(null)
    }
    function showDialog() {
        modalContent.set(<UserInfoModal {...{ dispatch, state, dismiss }} />)
    }

    return (
        <span
            className={L.view(
                state,
                (s) => s.status,
                (s) => `user-info ${s}`,
            )}
        >
            <span className="icon" onClick={showDialog}>
                {L.view(pictureURL, (p) => (p ? <img src={p} /> : <UserIcon />))}
            </span>
        </span>
    )
}
