import { Fragment, h } from "harmaja"
import { getNavigator } from "harmaja-router"
import * as L from "lonna"
import * as uuid from "uuid"
import { AccessLevel, Board, EventFromServer, UserSessionInfo } from "../../../../common/src/domain"
import { createBoardAndNavigate, Routes } from "../../board-navigation"
import { EditableSpan } from "../../components/EditableSpan"
import { BoardState, Dispatch } from "../../store/board-store"
import { defaultAccessPolicy, UserSessionState } from "../../store/user-session-store"
import { BackToAllBoardsLink } from "../toolbars/BackToAllBoardsLink"
import { SharingModalDialog } from "./SharingModalDialog"
import { UserInfoView } from "./UserInfoView"

export function BoardViewHeader({
    usersOnBoard,
    board,
    accessLevel,
    sessionState,
    dispatch,
    modalContent,
    eventsFromServer,
}: {
    usersOnBoard: L.Property<UserSessionInfo[]>
    board: L.Property<Board>
    accessLevel: L.Property<AccessLevel>
    sessionState: L.Property<UserSessionState>
    dispatch: Dispatch
    modalContent: L.Atom<any>
    eventsFromServer: L.EventStream<EventFromServer>
}) {
    const editingAtom = L.atom(false)
    const nameAtom = L.atom(
        L.view(board, (board) => board.name || ""),
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
            <span className="logo-area">
                <BackToAllBoardsLink />
            </span>
            {L.view(
                board,
                (b) => !!b,
                (b) =>
                    b && (
                        <>
                            <span data-test="board-name" id="board-info">
                                <span id="board-name">
                                    {L.view(accessLevel, (l) =>
                                        l === "read-only" ? (
                                            <span>
                                                {nameAtom} <small>read-only</small>
                                            </span>
                                        ) : (
                                            <EditableSpan value={nameAtom} editingThis={editingAtom} />
                                        ),
                                    )}
                                </span>
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
            <UserInfoView
                state={sessionState}
                usersOnBoard={usersOnBoard}
                dispatch={dispatch}
                modalContent={modalContent}
            />
        </header>
    )
}

const ShareButton = ({ onClick }: { onClick: () => void }) => {
    return (
        <a className="board-button" title="Sharing and permissions" onClick={onClick}>
            <svg viewBox="0 0 25 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <title>Sharing and permissions</title>
                <path
                    d="M0.941645 6.11807L21.2054 1.47105C21.3809 1.4308 21.5161 1.62489 21.4174 1.77556L14.237 12.7407C14.2219 12.7638 14.2021 12.7836 14.1789 12.7987L8.77875 16.3188C8.63058 16.4154 8.43918 16.2863 8.47328 16.1127L9.6818 9.96216C9.70067 9.86617 9.64732 9.77062 9.55571 9.73631L0.916195 6.5003C0.73048 6.43074 0.748347 6.1624 0.941645 6.11807Z"
                    fill="white"
                    stroke="#0A5AF5"
                    stroke-width="1.2"
                    stroke-linecap="round"
                />
                <path
                    d="M15.1744 17.9751L9.85705 10.1208C9.79688 10.0319 9.81759 9.91137 9.90397 9.84767L21.1175 1.57863C21.277 1.46099 21.4921 1.62213 21.424 1.80829L15.5279 17.9317C15.4719 18.0849 15.2659 18.1102 15.1744 17.9751Z"
                    fill="white"
                    stroke="#0A5AF5"
                    stroke-width="1.2"
                    stroke-linecap="round"
                />
            </svg>
        </a>
    )
}

const ForkButton = ({ onClick }: { onClick: () => void }) => {
    return (
        <a className="board-button" title="Make a copy" onClick={onClick}>
            <svg viewBox="0 0 22 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <title>Make a copy</title>
                <rect
                    x="6.56582"
                    y="5.86245"
                    width="14.0013"
                    height="14.0013"
                    rx="1.4"
                    fill="#0A5AF5"
                    fill-opacity="0.1"
                    stroke="#0A5AF5"
                    stroke-width="1.2"
                />
                <path
                    d="M3.6805 15.7398H3.18848C2.08391 15.7398 1.18848 14.8444 1.18848 13.7398V3.18433C1.18848 2.07976 2.08391 1.18433 3.18848 1.18433H13.8317C14.9363 1.18433 15.8317 2.07976 15.8317 3.18433V3.76324"
                    stroke="#0A5AF5"
                    stroke-width="1.2"
                    stroke-linecap="round"
                />
            </svg>
        </a>
    )
}
