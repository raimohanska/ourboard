import { Fragment, h } from "harmaja"
import * as L from "lonna"
import { TextInput } from "../../components/components"
import { UserIcon } from "../../components/Icons"
import { signIn, signOut } from "../../google-auth"
import { Dispatch } from "../../store/board-store"
import { canLogin, LoggingInServer, UserSessionState } from "../../store/user-session-store"

export const UserInfoModal = ({
    state,
    dispatch,
    dismiss,
}: {
    state: L.Property<UserSessionState>
    dispatch: Dispatch
    dismiss: () => void
}) => {
    const pictureURL = L.view(state, (s) => (s.status === "logged-in" ? s.picture : undefined))
    return (
        <span className="user-info">
            <h2>Welcome to OurBoard</h2>
            {L.view(
                state,
                (s) => s.status,
                (status) => {
                    switch (status) {
                        case "logging-in-server":
                        case "logging-in-local":
                            return null
                        case "logged-in":
                            return (
                                <div className="logged-in">
                                    <p>
                                        You're signed in as{" "}
                                        <span className="name">
                                            {L.view(state, (s) => (s as LoggingInServer).name)}
                                        </span>
                                        .
                                    </p>
                                    <p>
                                        <a className="login" onClick={signOut}>
                                            Sign out
                                        </a>{" "}
                                        to access the board anonymously.
                                    </p>
                                </div>
                            )
                        default:
                            return (
                                <div className="anonymous">
                                    <p className="nickname">
                                        <span>Select nickname to be shown to others</span>
                                        <NicknameEditor {...{ state, dispatch }} />
                                    </p>
                                    {L.view(
                                        state,
                                        canLogin,
                                        (show) =>
                                            show && (
                                                <p className="sign-in">
                                                    Or{" "}
                                                    <a className="login" onClick={signIn}>
                                                        sign in
                                                    </a>{" "}
                                                    using your Google account.
                                                </p>
                                            ),
                                    )}
                                </div>
                            )
                    }
                },
            )}
            <p>
                <button onClick={dismiss}>Done</button>
            </p>
        </span>
    )
}

const NicknameEditor = ({ state, dispatch }: { state: L.Property<UserSessionState>; dispatch: Dispatch }) => {
    const nicknameAtom = L.atom(L.view(state, "nickname"), (nickname) => {
        if (nickname === undefined) throw Error("Cannot set nickname to undefined")
        dispatch({ action: "nickname.set", nickname })
    })

    return <TextInput value={nicknameAtom} />
}
