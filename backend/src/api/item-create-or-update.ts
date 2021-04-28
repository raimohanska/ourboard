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
                    container: t.string,
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
                type,
                text,
                color,
                container,
                replaceTextIfExists,
                replaceColorIfExists,
                replaceContainerIfExists = true,
            } = request.body
            console.log(`PUT item for board ${board.board.id} item ${itemId}: ${JSON.stringify(request.req.body)}`)
            const existingItem = board.board.items[itemId]
            if (existingItem) {
                updateItem(
                    board,
                    type,
                    text,
                    color,
                    container,
                    itemId,
                    replaceTextIfExists,
                    replaceColorIfExists,
                    replaceContainerIfExists,
                )
            } else {
                console.log(`Adding new item`)
                addItem(board, type, text, color, container, itemId)
            }
            return ok({ ok: true })
        }),
    )

function updateItem(
    board: ServerSideBoardState,
    type: "note",
    text: string,
    color: Color,
    container: string | undefined,
    itemId: string,
    replaceTextIfExists: boolean | undefined,
    replaceColorIfExists: boolean | undefined,
    replaceContainerIfExists: boolean | undefined,
) {
    const existingItem = board.board.items[itemId]
    if (!isNote(existingItem)) {
        throw new InvalidRequest("Unexpected item type")
    }
    const containerItem = findContainer(container, board.board)
    const currentContainer = findContainer(existingItem.containerId, board.board)
    const containerAttrs =
        replaceContainerIfExists && containerItem !== currentContainer
            ? getItemAttributesForContainer(container, board.board)
            : {}

    let updatedItem: Note = {
        ...existingItem,
        ...containerAttrs,
        text: replaceTextIfExists !== false ? text : existingItem.text,
        color: replaceColorIfExists !== false ? color || existingItem.color : existingItem.color,
    }
    if (!_.isEqual(updatedItem, existingItem)) {
        console.log(`Updating existing item`)
        dispatchSystemAppEvent(board, { action: "item.update", boardId: board.board.id, items: [updatedItem] })
    } else {
        console.log(`Not updating: item not changed`)
    }
}
