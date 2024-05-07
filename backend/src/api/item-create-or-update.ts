import * as t from "io-ts"
import { NonEmptyString } from "io-ts-types"
import _ from "lodash"
import { ok } from "typera-common/response"
import { body } from "typera-express/parser"
import { Color, isNote, Note } from "../../../common/src/domain"
import { ServerSideBoardState } from "../board-state"
import {
    addItem,
    apiTokenHeader,
    checkBoardAPIAccess,
    dispatchSystemAppEvent,
    findContainer,
    getItemAttributesForContainer,
    InvalidRequest,
    route,
} from "./utils"
/**
 * Creates a new item on given board or updates an existing one.
 * If you want to add the item onto a specific area/container element on the board, you can
 * find the id of the container by inspecting with your browser.
 *
 * @tags Board
 */
export const itemCreateOrUpdate = route
    .put("/api/v1/board/:boardId/item/:itemId")
    .use(
        apiTokenHeader,
        body(
            t.intersection([
                t.type({
                    type: t.literal("note"),
                    text: NonEmptyString,
                    color: t.string,
                }),
                t.partial({
                    x: t.number,
                    y: t.number,
                    container: t.string,
                    width: t.number,
                    height: t.number,
                    replaceTextIfExists: t.boolean,
                    replaceColorIfExists: t.boolean,
                    replaceContainerIfExists: t.boolean,
                }),
            ]),
        ),
    )
    .handler((request) =>
        checkBoardAPIAccess(request, async (board) => {
            const { itemId } = request.routeParams
            let {
                x,
                y,
                type,
                text,
                color,
                container,
                width,
                height,
                replaceTextIfExists,
                replaceColorIfExists,
                replaceContainerIfExists = true,
            } = request.body
            console.log(`PUT item for board ${board.board.id} item ${itemId}: ${JSON.stringify(request.req.body)}`)
            const existingItem = board.board.items[itemId]
            if (existingItem) {
                updateItem(
                    board,
                    x ?? existingItem.x,
                    y ?? existingItem.y,
                    type,
                    text,
                    color,
                    container,
                    width ?? existingItem.width,
                    height ?? existingItem.height,
                    itemId,
                    replaceTextIfExists,
                    replaceColorIfExists,
                    replaceContainerIfExists,
                )
            } else {
                console.log(`Adding new item`)
                const partialParams = { x, y, width, height }
                if (x !== undefined || y !== undefined || width !== undefined || height !== undefined) {
                    addItem(board, type, text, color, container, itemId, partialParams)
                } else {
                    addItem(board, type, text, color, container, itemId)
                }
            }
            return ok({ ok: true })
        }),
    )

function updateItem(
    board: ServerSideBoardState,
    x: number,
    y: number,
    type: "note",
    text: string,
    color: Color,
    container: string | undefined,
    width: number,
    height: number,
    itemId: string,
    replaceTextIfExists: boolean | undefined,
    replaceColorIfExists: boolean | undefined,
    replaceContainerIfExists: boolean | undefined,
) {
    const existingItem = board.board.items[itemId]

    if (!isNote(existingItem)) {
        throw new InvalidRequest("Unexpected item type")
    }

    let updatedItem: Note = {
        ...existingItem,
        x: x !== undefined ? x : existingItem.x,
        y: y !== undefined ? y : existingItem.y,
        text: replaceTextIfExists !== false ? text : existingItem.text,
        color: replaceColorIfExists !== false ? color || existingItem.color : existingItem.color,
        width: width !== undefined ? width : existingItem.width,
        height: height !== undefined ? height : existingItem.height,
    }

    if (container && replaceContainerIfExists !== false) {
        const containerItem = findContainer(container, board.board)
        const currentContainer = findContainer(existingItem.containerId, board.board)
        const containerAttrs =
            containerItem !== currentContainer ? getItemAttributesForContainer(container, board.board) : {}

        updatedItem = {
            ...updatedItem,
            ...containerAttrs,
        }
    }

    if (!_.isEqual(updatedItem, existingItem)) {
        console.log(`Updating existing item`)
        dispatchSystemAppEvent(board, { action: "item.update", boardId: board.board.id, items: [updatedItem] })
    } else {
        console.log(`Not updating: item not changed`)
    }
}
