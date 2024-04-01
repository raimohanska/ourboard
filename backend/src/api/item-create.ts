import * as t from "io-ts"
import { ok } from "typera-common/response"
import { body } from "typera-express/parser"
import { addItem, apiTokenHeader, checkBoardAPIAccess, route } from "./utils"

/**
 * Creates a new item on given board.
 *
 * @tags Board
 */
export const itemCreate = route
    .post("/api/v1/board/:boardId/item")
    .use(
        apiTokenHeader,
        body(
            t.type({
                x: t.number,
                y: t.number,
                type: t.literal("note"),
                text: t.string,
                color: t.string,
                width: t.number,
                height: t.number,
            }),
        ),
    )
    .handler((request) =>
        checkBoardAPIAccess(request, async (board) => {
            const { x, y, type, text, color, width, height } = request.body
            console.log(`POST item for board ${board.board.id}: ${JSON.stringify(request.req.body)}`)
            const item = addItem(board, x, y, type, text, color, width, height)
            return ok(item)
        }),
    )
