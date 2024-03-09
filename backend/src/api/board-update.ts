import * as t from "io-ts"
import { NonEmptyString } from "io-ts-types"
import { ok } from "typera-common/response"
import { body } from "typera-express/parser"
import { BoardAccessPolicyCodec } from "../../../common/src/domain"
import { updateBoard } from "../board-store"
import { apiTokenHeader, checkBoardAPIAccess, dispatchSystemAppEvent, route } from "./utils"

/**
 * Changes board name and, optionally, access policy.
 *
 * @tags Board
 */
export const boardUpdate = route
    .put("/api/v1/board/:boardId")
    .use(apiTokenHeader, body(t.type({ name: NonEmptyString, accessPolicy: BoardAccessPolicyCodec })))
    .handler((request) =>
        checkBoardAPIAccess(request, async (board) => {
            const { boardId } = request.routeParams
            const { name, accessPolicy } = request.body
            await updateBoard({ boardId, name, accessPolicy: accessPolicy ?? board.board.accessPolicy })
            dispatchSystemAppEvent(board, { action: "board.rename", boardId, name })
            if (accessPolicy) {
                dispatchSystemAppEvent(board, { action: "board.setAccessPolicy", boardId, accessPolicy })
            }
            return ok({ ok: true })
        }),
    )
