import { Fragment, h } from "harmaja"
import * as L from "lonna"
import { Board, checkBoardAccess } from "../../../../common/src/domain"
import { BoardAccessPolicyEditor } from "../../components/BoardAccessPolicyEditor"
import { Dispatch, sessionState2UserInfo } from "../../store/board-store"
import { UserSessionState } from "../../store/user-session-store"

export const SharingModalDialog = ({
    board,
    sessionState,
    dismiss,
    dispatch,
}: {
    board: L.Property<Board>
    sessionState: L.Property<UserSessionState>
    dismiss: () => void
    dispatch: Dispatch
}) => {
    const originalAccessPolicy = board.get().accessPolicy
    const accessPolicy = L.atom(originalAccessPolicy)

    const copied = L.atom(false)
    function copyToClipboard() {
        navigator.clipboard.writeText(document.location.toString())
        copied.set(true)
        setTimeout(() => copied.set(false), 3000)
    }
    function saveChanges() {
        dispatch({ action: "board.setAccessPolicy", boardId: board.get().id, accessPolicy: accessPolicy.get()! })
        dismiss()
    }
    const adminAccess = L.view(
        sessionState,
        (s) => checkBoardAccess(originalAccessPolicy, sessionState2UserInfo(s)) === "admin",
    )

    return (
        <span className="sharing">
            <h2>Sharing</h2>
            <button onClick={copyToClipboard}>Copy board link</button>
            {L.view(copied, (c) => (c ? <span className="copied">Copied to clipboard.</span> : null))}
            {L.view(sessionState, adminAccess, (s, admin) =>
                s.status === "logged-in" && admin ? (
                    <>
                        <h2>Manage board permissions</h2>
                        <BoardAccessPolicyEditor {...{ accessPolicy, user: s }} />
                        <p>
                            <button
                                onClick={saveChanges}
                                disabled={L.view(accessPolicy, (ap) => ap === originalAccessPolicy)}
                            >
                                Save changes
                            </button>
                        </p>
                    </>
                ) : originalAccessPolicy ? (
                    <>
                        <h2>Board permissions</h2>
                        <p>You don't have the privileges to change board permissions</p>
                    </>
                ) : (
                    <>
                        <h2>Board permissions</h2>
                        <p>
                            Anonymous boards are accessible to anyone with the link. To control board permissions,
                            create a new board when logged in.
                        </p>
                    </>
                ),
            )}
        </span>
    )
}
