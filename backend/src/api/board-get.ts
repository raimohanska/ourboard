import { ok } from "typera-common/response"
import { apiTokenHeader, checkBoardAPIAccess, route } from "./utils"
import { yWebSocketServer } from "../board-yjs-server"
import { augmentBoardWithCRDT } from "../../../common/src/board-crdt-helper"

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
            const board = augmentBoardWithCRDT(
                await yWebSocketServer.docs.getYDocAndWaitForFetch(boardState.board.id),
                boardState.board,
            )
            return ok({ board })
        }),
    )
