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
                streamingBody((stream) => {
                    // Due to memory concerns we fetch board histories from DB as chunks, so this API
                    // response must also be chunked
                    stream.write('{"history":[')
                    let chunksProcessed = 0
                    withDBClient(async (client) =>
                        getFullBoardHistory(board.board.id, client, (event) => {
                            if (event.state === "error") {
                                stream.write(`],"error":${event.error.message}}`)
                                stream.end()
                                return
                            }

                            if (event.state === "chunk") {
                                let prefix = chunksProcessed === 0 ? "" : ","
                                stream.write(`${prefix}${event.chunk.map((ev) => JSON.stringify(ev)).join(",")}`)
                                chunksProcessed++
                                return
                            }

                            if (event.state === "done") {
                                stream.write("]}")
                                stream.end()
                            }
                        }),
                    )
                }),
            )
        }),
    )
