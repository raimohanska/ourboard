import { createArrayCsvStringifier } from "csv-writer"
import _ from "lodash"
import { ok } from "typera-common/response"
import { Board, Container, Item, TextItem } from "../../../common/src/domain"
import { apiTokenHeader, checkBoardAPIAccess, route } from "./utils"

/**
 * Gets board current contents
 *
 * @tags Board
 */
export const boardCSVGet = route
    .get("/api/v1/board/:boardId/csv")
    .use(apiTokenHeader)
    .handler((request) =>
        checkBoardAPIAccess(request, async (boardState) => {
            const board = boardState.board
            const textItemsWithParent = Object.values(board.items).filter(
                (i) => i.containerId !== undefined && (i.type === "text" || i.type === "note"),
            )
            const textItemGroups = _.groupBy(textItemsWithParent, (i) => i.containerId)
            const rows = Object.entries(textItemGroups).map(([parentId, textItems]) => {
                const rowContainer = board.items[parentId]
                return {
                    parents: parentChain(board)(rowContainer),
                    rowContainer,
                    textItems,
                } as Row
            })
            if (rows.length === 0) return csv(board, [])
            const maxDepth = _.max(rows.map((r) => r.parents.length))!
            const csvData = rows.map((r) => {
                return [
                    ...r.parents.map((c) => c.text),
                    ..._.times(maxDepth - r.parents.length, () => ""),
                    r.rowContainer.text,
                    ...r.textItems.map((i) => i.text),
                ]
            })
            return csv(board, csvData)
        }),
    )

type Row = { parents: Container[]; rowContainer: Container; textItems: TextItem[] }

const parentChain = (board: Board) => (item: Item): Container[] => {
    if (!item.containerId) return []
    const parent = board.items[item.containerId]
    if (parent.type !== "container")
        throw Error(`Parent item ${item.containerId} is of type ${parent.type}, expecting container`)
    return [parent, ...parentChain(board)(parent)]
}

function csv(board: Board, rows: string[][]) {
    const result = createArrayCsvStringifier({}).stringifyRecords(rows)
    return ok(result, { "content-type": "text/csv", "content-disposition": `attachment; filename=${board.name}.csv` })
}
