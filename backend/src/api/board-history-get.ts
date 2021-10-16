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
                streamingJSONBody("history", async (callback) => {
                    await withDBClient(
                        async (client) =>
                            await getFullBoardHistory(board.board.id, client, (bundle) => bundle.forEach(callback)),
                    )
                }),
            )
        }),
    )

function streamingJSONBody(fieldName: string, generator: (callback: (item: any) => void) => Promise<void>) {
    return streamingBody(async (stream) => {
        // Due to memory concerns we fetch board histories from DB as chunks, so this API
        // response must also be chunked
        try {
            stream.write(`{"${fieldName}":[`)
            let chunksProcessed = 0
            await generator((item) => {
                let prefix = chunksProcessed === 0 ? "" : ","
                stream.write(`${prefix}${JSON.stringify(item)}`)
                chunksProcessed++
            })
            stream.write("]}")
            stream.end()
            //console.log(`Wrote ${chunksProcessed} chunks`)
        } catch (e) {
            console.error(`Error writing a streamed body: ${e}`)
            stream.end()
        }
    })
}
