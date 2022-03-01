import { h } from "harmaja"
import * as L from "lonna"
import { UserIcon } from "../../components/Icons"
import { Dispatch } from "../../store/board-store"
import { UserSessionState } from "../../store/user-session-store"
import { UserInfoModal } from "./UserInfoModal"

export const UserInfoView = ({
    state,
    dispatch,
    modalContent,
}: {
    state: L.Property<UserSessionState>
    dispatch: Dispatch
    modalContent: L.Atom<any>
}) => {
    const pictureURL = L.view(state, (s) => (s.status === "logged-in" ? s.picture : undefined))

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
