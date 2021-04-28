import { ok } from "typera-common/response"
import { getFullBoardHistory } from "../board-store"
import { withDBClient } from "../db"
import { apiTokenHeader, checkBoardAPIAccess, route } from "./utils"

/**
 * List the history of a board
 *
 * @tags Board
 */
export const boardHistoryGet = route
    .get("/api/v1/board/:boardId/history")
    .use(apiTokenHeader)
    .handler((request) =>
        checkBoardAPIAccess(request, async (board) => {
            const history = await withDBClient((client) => getFullBoardHistory(board.board.id, client))
            return ok({ history })
        }),
    )
