import * as t from "io-ts"
import { NonEmptyString } from "io-ts-types"
import { ok } from "typera-common/response"
import { body } from "typera-express/parser"
import {
    Board,
    BoardAccessPolicyCodec,
    CrdtDisabled,
    CrdtEnabled,
    newBoard,
    optional,
} from "../../../common/src/domain"
import { addBoard } from "../board-state"
import { route } from "./utils"
import { getConfig } from "../config"
/**
 * Creates a new board.
 *
 * @tags Board
 */
export const boardCreate = route
    .post("/api/v1/board")
    .use(body(t.type({ name: NonEmptyString, accessPolicy: BoardAccessPolicyCodec, crdt: optional(t.literal(true)) })))
    .handler(async (request) => {
        const crdt = (getConfig().crdt === "true" || request.body.crdt) ?? false
        let board: Board = newBoard(request.body.name, crdt ? CrdtEnabled : CrdtDisabled, request.body.accessPolicy)
        const boardWithHistory = await addBoard(board, true)
        return ok({ id: boardWithHistory.board.id, accessToken: boardWithHistory.accessTokens[0] })
    })
