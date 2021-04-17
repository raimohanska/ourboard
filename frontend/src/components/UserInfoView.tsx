import { h } from "harmaja"
import * as L from "lonna"
import { canLogin, UserSessionState, LoggingInServer } from "../store/user-session-store"
import { EditableSpan } from "./EditableSpan"
import { signIn, signOut } from "../google-auth"
import { Dispatch } from "../store/board-store"

export const UserInfoView = ({ state, dispatch }: { state: L.Property<UserSessionState>; dispatch: Dispatch }) => {
    return (
        <span
            className={L.view(
                state,
                (s) => s.status,
                (s) => `user-info ${s}`,
            )}
        >
            <span className="icon user" />
            {L.view(
                state,
                (s) => s.status,
                (status) => {
                    switch (status) {
                        case "logging-in-server":
                        case "logged-in":
                            return (
                                <span>
                                    {L.view(state, (s) => (s as LoggingInServer).name)}
                                    <a className="login" onClick={signOut}>
                                        Sign out
                                    </a>
                                </span>
                            )
                        default:
                            return (
                                <span>
                                    <NicknameEditor {...{ state, dispatch }} />
                                    {L.view(
                                        state,
                                        canLogin,
                                        (show) =>
                                            show && (
                                                <a className="login" onClick={signIn}>
                                                    Sign in
                                                </a>
                                            ),
                                    )}
                                </span>
                            )
                    }
                },
            )}
        </span>
    )
}

const NicknameEditor = ({ state, dispatch }: { state: L.Property<UserSessionState>; dispatch: Dispatch }) => {
    const editingThis = L.atom(false)

    const nicknameAtom = L.atom(L.view(state, "nickname"), (nickname) => {
        if (nickname === undefined) throw Error("Cannot set nickname to undefined")
        dispatch({ action: "nickname.set", nickname })
    })

    return L.view(
        nicknameAtom,
        (n) => n !== undefined,
        (n) =>
            n && (
                <EditableSpan
                    title="Edit your nickname"
                    className="nickname"
                    {...{ value: nicknameAtom as L.Atom<string>, editingThis }}
                />
            ),
    )
}
