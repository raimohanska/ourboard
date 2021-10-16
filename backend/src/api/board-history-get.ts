import { ok, streamingBody } from "typera-common/response"
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
            return ok(
                streamingBody(async (stream) => {
                    // Due to memory concerns we fetch board histories from DB as chunks, so this API
                    // response must also be chunked
                    stream.write('{"history":[')
                    let chunksProcessed = 0
                    await withDBClient(
                        async (client) =>
                            await getFullBoardHistory(board.board.id, client, (chunk) => {
                                let prefix = chunksProcessed === 0 ? "" : ","
                                stream.write(`${prefix}${chunk.map((ev) => JSON.stringify(ev)).join(",")}`)
                                chunksProcessed++
                            }),
                    )
                        .then(() => {
                            stream.write("]}")
                            stream.end()
                        })
                        .catch((e) => {
                            stream.end()
                        })
                }),
            )
        }),
    )
