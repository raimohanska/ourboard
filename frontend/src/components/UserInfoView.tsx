import { h, Fragment } from "harmaja"
import * as L from "lonna"
import { BoardAppState, Dispatch } from "../store/state-store"
import { EditableSpan } from "./EditableSpan"
import { signIn, signOut, userInfo } from "../google-auth"

export const UserInfoView = ({ state, dispatch }: { state: L.Property<BoardAppState>; dispatch: Dispatch }) => {
    return (
        <span className="user-info">
            {L.view(userInfo, (user) => {
                switch (user.status) {
                    case "in-progress":
                        return ""
                    case "signed-in":
                        return (
                            <span>
                                {user.name}
                                <a className="login" onClick={signOut}>
                                    Sign out
                                </a>
                            </span>
                        )
                    case "signed-out":
                        return (
                            <span>
                                <NicknameEditor {...{ state, dispatch }} />
                                <a className="login" onClick={signIn}>
                                    Sign in
                                </a>
                            </span>
                        )
                    case "not-supported":
                        return (
                            <span>
                                <NicknameEditor {...{ state, dispatch }} />
                            </span>
                        )
                }
            })}
        </span>
    )
}

const NicknameEditor = ({ state, dispatch }: { state: L.Property<BoardAppState>; dispatch: Dispatch }) => {
    const editingThis = L.atom(false)

    const nicknameAtom = L.atom(L.view(state, "nickname"), (nickname) => {
        const userId = state.get().userId
        if (!userId) throw Error("User id missing")
        if (nickname === undefined) throw Error("Cannot set nickname to undefined")
        dispatch({ action: "nickname.set", nickname, userId })
    })

    return L.view(
        nicknameAtom,
        (n) => n !== undefined,
        (n) =>
            n && (
                <EditableSpan
                    title="Edit your nickname"
                    showIcon={true}
                    className="nickname"
                    {...{ value: nicknameAtom as L.Atom<string>, editingThis }}
                />
            ),
    )
}
