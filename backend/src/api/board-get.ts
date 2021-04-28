import { ok } from "typera-common/response"
import { apiTokenHeader, checkBoardAPIAccess, route } from "./utils"

/**
 * Gets board current contents
 *
 * @tags Board
 */
export const boardGet = route
    .get("/api/v1/board/:boardId")
    .use(apiTokenHeader)
    .handler((request) =>
        checkBoardAPIAccess(request, async (boardState) => {
            return ok({ board: boardState.board })
        }),
    )
