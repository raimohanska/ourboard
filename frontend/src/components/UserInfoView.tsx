import { h, Fragment } from "harmaja";
import * as L from "lonna";
import { BoardAppState, Dispatch } from "../board/board-store";
import { EditableSpan } from "./EditableSpan";

export const UserInfoView = ({ state, dispatch }: { state: L.Property<BoardAppState>, dispatch: Dispatch }) => {
    const editingThis = L.atom(false)
    const nicknameAtom = L.atom(L.view(state, "nickname"), nickname => {
        const userId = state.get().userId
        if (!userId) throw Error("User id missing")
        if (nickname === undefined) throw Error("Cannot set nickname to undefined")
        dispatch({ action: "nickname.set", nickname, userId })
    })
    return <span className="user-info">
        { L.view(nicknameAtom, n => n !== undefined, n => n && <EditableSpan title="Edit your nickname" showIcon={true} className="nickname" {...{ value: nicknameAtom as L.Atom<string>, editingThis}}/>) }
        <span className="icon user"/>
    </span>
}