import { h, Fragment } from "harmaja"
import { getNavigator } from "harmaja-router"
import * as L from "lonna"
import { AccessLevel, Board, checkBoardAccess, EventFromServer } from "../../../../common/src/domain"
import { createBoardAndNavigate, Routes } from "../../board-navigation"
import { EditableSpan } from "../../components/EditableSpan"
import { UserInfoView } from "./UserInfoView"
import { Dispatch, sessionState2UserInfo } from "../../store/board-store"
import { UserSessionState, defaultAccessPolicy } from "../../store/user-session-store"
import * as uuid from "uuid"
import { BoardAccessPolicyEditor } from "../../components/BoardAccessPolicyEditor"

export function BoardViewHeader({
    board,
    accessLevel,
    sessionState,
    dispatch,
    modalContent,
    eventsFromServer,
}: {
    board: L.Property<Board>
    accessLevel: L.Property<AccessLevel>
    sessionState: L.Property<UserSessionState>
    dispatch: Dispatch
    modalContent: L.Atom<any>
    eventsFromServer: L.EventStream<EventFromServer>
}) {
    const editingAtom = L.atom(false)
    const nameAtom = L.atom(
        L.view(board, (board) => board?.name || ""),
        (newName) => dispatch({ action: "board.rename", boardId: board.get()!.id, name: newName }),
    )
    const navigator = getNavigator<Routes>()
    function makeCopy() {
        const newBoard = {
            ...board.get(),
            name: `${nameAtom.get()} copy`,
            id: uuid.v4(),
            accessPolicy: defaultAccessPolicy(sessionState.get(), false),
        }
        createBoardAndNavigate(newBoard, dispatch, navigator, eventsFromServer)
    }

    return (
        <header>
            <span className="logo-area" />
            {L.view(
                board,
                (b) => !!b,
                (b) =>
                    b && (
                        <>
                            <span data-test="board-name" id="board-name">
                                {L.view(accessLevel, (l) =>
                                    l === "read-only" ? (
                                        <span>
                                            {nameAtom} <small>read-only</small>
                                        </span>
                                    ) : (
                                        <EditableSpan value={nameAtom} editingThis={editingAtom} />
                                    ),
                                )}
                                <ForkButton onClick={makeCopy} />
                                <ShareButton
                                    onClick={() =>
                                        modalContent.set(
                                            <SharingModalDialog
                                                {...{
                                                    board,
                                                    sessionState,
                                                    dismiss: () => modalContent.set(null),
                                                    dispatch,
                                                }}
                                            />,
                                        )
                                    }
                                />
                            </span>
                        </>
                    ),
            )}
            <UserInfoView state={sessionState} dispatch={dispatch} />
        </header>
    )
}

const SharingModalDialog = ({
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

const ShareButton = ({ onClick }: { onClick: () => void }) => {
    return (
        <a title="Sharing and permissions" onClick={onClick}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M3.5 5.00006C3.22386 5.00006 3 5.22392 3 5.50006L3 11.5001C3 11.7762 3.22386 12.0001 3.5 12.0001L11.5 12.0001C11.7761 12.0001 12 11.7762 12 11.5001L12 5.50006C12 5.22392 11.7761 5.00006 11.5 5.00006L10.25 5.00006C9.97386 5.00006 9.75 4.7762 9.75 4.50006C9.75 4.22392 9.97386 4.00006 10.25 4.00006L11.5 4.00006C12.3284 4.00006 13 4.67163 13 5.50006L13 11.5001C13 12.3285 12.3284 13.0001 11.5 13.0001L3.5 13.0001C2.67157 13.0001 2 12.3285 2 11.5001L2 5.50006C2 4.67163 2.67157 4.00006 3.5 4.00006L4.75 4.00006C5.02614 4.00006 5.25 4.22392 5.25 4.50006C5.25 4.7762 5.02614 5.00006 4.75 5.00006L3.5 5.00006ZM7 1.6364L5.5682 3.0682C5.39246 3.24393 5.10754 3.24393 4.9318 3.0682C4.75607 2.89246 4.75607 2.60754 4.9318 2.4318L7.1818 0.181802C7.26619 0.09741 7.38065 0.049999 7.5 0.049999C7.61935 0.049999 7.73381 0.09741 7.8182 0.181802L10.0682 2.4318C10.2439 2.60754 10.2439 2.89246 10.0682 3.0682C9.89246 3.24393 9.60754 3.24393 9.4318 3.0682L8 1.6364L8 8.5C8 8.77614 7.77614 9 7.5 9C7.22386 9 7 8.77614 7 8.5L7 1.6364Z"
                    fill="currentColor"
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                ></path>
            </svg>
        </a>
    )
}

const ForkButton = ({ onClick }: { onClick: () => void }) => {
    return (
        <a title="Make a copy" onClick={onClick}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M1 9.50006C1 10.3285 1.67157 11.0001 2.5 11.0001H4L4 10.0001H2.5C2.22386 10.0001 2 9.7762 2 9.50006L2 2.50006C2 2.22392 2.22386 2.00006 2.5 2.00006L9.5 2.00006C9.77614 2.00006 10 2.22392 10 2.50006V4.00002H5.5C4.67158 4.00002 4 4.67159 4 5.50002V12.5C4 13.3284 4.67158 14 5.5 14H12.5C13.3284 14 14 13.3284 14 12.5V5.50002C14 4.67159 13.3284 4.00002 12.5 4.00002H11V2.50006C11 1.67163 10.3284 1.00006 9.5 1.00006H2.5C1.67157 1.00006 1 1.67163 1 2.50006V9.50006ZM5 5.50002C5 5.22388 5.22386 5.00002 5.5 5.00002H12.5C12.7761 5.00002 13 5.22388 13 5.50002V12.5C13 12.7762 12.7761 13 12.5 13H5.5C5.22386 13 5 12.7762 5 12.5V5.50002Z"
                    fill="currentColor"
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                ></path>
            </svg>
        </a>
    )
}
