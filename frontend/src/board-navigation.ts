import { HarmajaRouter } from "harmaja-router"
import * as L from "lonna"
import "./app.scss"

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
