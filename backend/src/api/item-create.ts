import * as t from "io-ts"
import { ok } from "typera-common/response"
import { body } from "typera-express/parser"
import { addItem, apiTokenHeader, checkBoardAPIAccess, route } from "./utils"

/**
 * Creates a new item on given board. If you want to add the item onto a
 * specific area/container element on the board, you can find the id of the
 * container by inspecting with your browser.
 *
 * @tags Board
 */
export const itemCreate = route
    .post("/api/v1/board/:boardId/item")
    .use(
        apiTokenHeader,
        body(
            t.intersection([
                t.type({
                    type: t.literal("note"),
                    text: t.string,
                    color: t.string,
                }),
                t.partial({
                    container: t.string,
                    x: t.number,
                    y: t.number,
                    width: t.number,
                    height: t.number,
                }),
            ]),
        ),
    )
    .handler((request) =>
        checkBoardAPIAccess(request, async (board) => {
            const { type, text, color, container, ...rest } = request.body
            console.log(`POST item for board ${board.board.id}: ${JSON.stringify(request.req.body)}`)
            const item = addItem(board, type, text, color, container, undefined, rest)
            return ok(item)
        }),
    )
