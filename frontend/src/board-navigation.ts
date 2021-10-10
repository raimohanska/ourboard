import { HarmajaRouter } from "harmaja-router"
import * as L from "lonna"
import "./app.scss"
import * as uuid from "uuid"

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

import { Navigator } from "harmaja-router"
import { Board, BoardAccessPolicy, BoardStub } from "../../common/src/domain"
import { Dispatch } from "./store/server-connection"

export function createBoardAndNavigate(newBoard: Board | BoardStub, dispatch: Dispatch, navigator: Navigator<Routes>) {
    dispatch({ action: "board.add", payload: newBoard })
    setTimeout(() => navigator.navigateByParams(BOARD_PATH, { boardId: newBoard.id }), 100) // TODO: some ack based solution would be more reliable
}
