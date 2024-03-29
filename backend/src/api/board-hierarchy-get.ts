import { ok } from "typera-common/response"
import { Board, Item } from "../../../common/src/domain"
import { apiTokenHeader, checkBoardAPIAccess, route } from "./utils"
import { augmentBoardWithCRDT } from "../../../common/src/board-crdt-helper"
import { yWebSocketServer } from "../board-yjs-server"

/**
 * Gets board current contents
 *
 * @tags Board
 */
export const boardHierarchyGet = route
    .get("/api/v1/board/:boardId/hierarchy")
    .use(apiTokenHeader)
    .handler((request) =>
        checkBoardAPIAccess(request, async (boardState) => {
            const board = augmentBoardWithCRDT(
                await yWebSocketServer.docs.getYDocAndWaitForFetch(boardState.board.id),
                boardState.board,
            )
            return ok({ board: getBoardHierarchy(board) })
        }),
    )

export type ItemHierarchy = Item & { children: ItemHierarchy[] }
export function getBoardHierarchy(board: Board) {
    const allItems = Object.values(board.items)
    const rootItems = allItems.filter((i) => i.containerId === undefined).map(getItemHierarchy(allItems))
    return { ...board, items: rootItems }
}
const getItemHierarchy = (items: Item[]) => (item: Item): ItemHierarchy => {
    const children: ItemHierarchy[] = items.filter((i) => i.containerId === item.id).map(getItemHierarchy(items))
    return { ...item, children }
}
