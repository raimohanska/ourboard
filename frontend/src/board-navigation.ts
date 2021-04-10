import { componentScope } from "harmaja"
import * as L from "lonna"
import { Id } from "../../common/src/domain"
import "./app.scss"
import { ReactiveRouter } from "./components/harmaja-router"

export function BoardNavigation() {
    const BOARD_PATH = "/b/:boardId"
    const ROOT_PATH = "/"
    const router = ReactiveRouter(
        {
            [ROOT_PATH]: () => ({ page: "Dashboard" as const }),
            [BOARD_PATH]: ({ boardId }) => ({ page: "Board" as const, boardId }),
            "": () => ({ page: "NotFound" as const }),
        },
        L.globalScope,
    )

    const nicknameFromURL = new URLSearchParams(location.search).get("nickname")
    if (nicknameFromURL) {
        localStorage.nickname = nicknameFromURL
        const search = new URLSearchParams(location.search)
        search.delete("nickname")
        document.location.search = search.toString()
    }

    const boardId = L.view(router.result, (r) => (r.page === "Board" ? r.boardId : undefined))

    const navigateToBoard = (id: Id | undefined) => {
        if (id) {
            router.navigateByParams(BOARD_PATH, { boardId: id })
        } else {
            router.navigateByParams(ROOT_PATH)
        }
    }

    return {
        boardId,
        navigateToBoard,
        page: router.result,
    }
}
