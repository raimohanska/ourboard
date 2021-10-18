import { HarmajaRouter, Navigator } from "harmaja-router"
import * as L from "lonna"
import { Board, BoardStub, EventFromServer } from "../../common/src/domain"
import "./app.scss"
import { Dispatch } from "./store/server-connection"

export const BOARD_PATH = "/b/:boardId"
export const ROOT_PATH = "/"

export const Routes = {
    [ROOT_PATH]: () => ({ page: "Dashboard" as const }),
    [BOARD_PATH]: ({ boardId }: { boardId: string }) => ({ page: "Board" as const, boardId }),
    "": () => ({ page: "NotFound" as const }),
}
export type Routes = typeof Routes

export function BoardNavigation() {
    const result = HarmajaRouter(Routes)

    const nicknameFromURL = new URLSearchParams(location.search).get("nickname")
    if (nicknameFromURL) {
        localStorage.nickname = nicknameFromURL
        const search = new URLSearchParams(location.search)
        search.delete("nickname")
        document.location.search = search.toString()
    }

    const boardId = L.view(result, (r) => (r.page === "Board" ? r.boardId : undefined))

    return {
        boardId,
        page: result,
    }
}

export function createBoardAndNavigate(
    newBoard: Board | BoardStub,
    dispatch: Dispatch,
    navigator: Navigator<Routes>,
    serverEvents: L.EventStream<EventFromServer>,
) {
    dispatch({ action: "board.add", payload: newBoard })
    serverEvents.forEach(
        (e) => e.action === "board.add.ack" && navigator.navigateByParams(BOARD_PATH, { boardId: newBoard.id }),
    )
}
