import { AppEvent, defaultBoardSize, isFullyFormedBoard } from "../../common/src/domain"
import { addBoard } from "./board-state"
import { MessageHandlerResult } from "./connection-handler"
import { verifyGoogleTokenAndUserInfo } from "./google-token-verifier"
import { getSession, logoutUser, setNicknameForSession, setVerifiedUserForSession } from "./sessions"
import {
    associateUserWithBoard,
    dissociateUserWithBoard,
    getUserAssociatedBoards,
    getUserIdForEmail,
} from "./user-store"
import { WsWrapper } from "./ws-wrapper"

export async function handleCommonEvent(socket: WsWrapper, appEvent: AppEvent): Promise<MessageHandlerResult> {
    switch (appEvent.action) {
        case "auth.login": {
            const success = await verifyGoogleTokenAndUserInfo(appEvent)
            const userId = await getUserIdForEmail(appEvent.email)
            const session = getSession(socket)
            if (session && success) {
                const userInfo = await setVerifiedUserForSession(appEvent, session)
                console.log(`${appEvent.name} logged in`)
                session.sendEvent({ action: "auth.login.response", success, userId })
                for (let board of session.boards) {
                    await associateUserWithBoard(userId, board.boardId)
                }
                session.sendEvent({
                    action: "user.boards",
                    email: appEvent.email,
                    boards: await getUserAssociatedBoards(userInfo),
                })
            } else if (session) {
                session.sendEvent({ action: "auth.login.response", success: false })
            }
            return true
        }
        case "auth.logout": {
            const session = getSession(socket)
            if (session && session.userInfo.userType === "authenticated") {
                logoutUser(appEvent, socket)
                console.log(`${session.userInfo.name} logged out`)
            }
            return true
        }
        case "nickname.set": {
            setNicknameForSession(appEvent, socket)
            return true
        }
        case "board.associate": {
            // TODO: maybe access check? Not security-wise necessary
            const session = getSession(socket)
            if (session) {
                if (session.userInfo.userType !== "authenticated") {
                    console.warn("Trying to associate board without authenticated user")
                    return true
                }
                const userId = session.userInfo.userId
                await associateUserWithBoard(userId, appEvent.boardId, appEvent.lastOpened)
            }
            return true
        }
        case "board.dissociate": {
            const session = getSession(socket)
            if (session) {
                if (session.userInfo.userType !== "authenticated") {
                    console.warn("Trying to dissociate board without authenticated user")
                    return true
                }
                const userId = session.userInfo.userId
                await dissociateUserWithBoard(userId, appEvent.boardId)
            }
            return true
        }
        case "board.add": {
            const { payload } = appEvent
            const board = !isFullyFormedBoard(payload)
                ? { ...defaultBoardSize, ...payload, items: [], serial: 0 }
                : payload
            await addBoard(board)
            return true
        }
        case "ping": {
            return true
        }
    }
    return false
}
