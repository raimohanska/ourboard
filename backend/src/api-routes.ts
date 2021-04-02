import * as bodyParser from "body-parser"
import {
    Board,
    createBoard,
    EventUserInfo,
    BoardHistoryEntry,
    AppEvent,
    newNote,
    Note,
    Color,
    PersistableBoardItemEvent,
    isNote,
    Container,
    BoardAccessPolicyCodec,
} from "../../common/src/domain"
import { addBoard, getBoard, updateBoards, ServerSideBoardState } from "./board-state"
import { getBoardHistory, getFullBoardHistory, updateBoard } from "./board-store"
import { broadcastBoardEvent } from "./sessions"
import { encode as htmlEncode } from "html-entities"
import _ from "lodash"
import { RED, YELLOW } from "../../common/src/colors"
import { applyMiddleware, router } from "typera-express"
import { wrapNative } from "typera-express/middleware"
import { body, headers } from "typera-express/parser"
import { badRequest, internalServerError, notFound, ok } from "typera-common/response"
import * as t from "io-ts"
import { NonEmptyString } from "io-ts-types"
import { withDBClient } from "./db"

const route = applyMiddleware(wrapNative(bodyParser.json()))
const apiTokenHeader = headers(t.partial({ API_TOKEN: t.string }))

/**
 * Creates a new board.
 *
 * @tags Board
 */
const boardCreate = route
    .post("/api/v1/board")
    .use(body(t.type({ name: NonEmptyString, accessPolicy: BoardAccessPolicyCodec })))
    .handler(async (request) => {
        let board: Board = createBoard(request.body.name, request.body.accessPolicy)
        const boardWithHistory = await addBoard(board, true)
        return ok({ id: boardWithHistory.board.id, accessToken: boardWithHistory.accessTokens[0] })
    })

/**
 * Changes board name and, optionally, access policy.
 *
 * @tags Board
 */
const boardUpdate = route
    .put("/api/v1/board/:boardId")
    .use(apiTokenHeader, body(t.type({ name: NonEmptyString, accessPolicy: BoardAccessPolicyCodec })))
    .handler((request) =>
        checkBoardAPIAccess(request, async () => {
            const { boardId } = request.routeParams
            const { name, accessPolicy } = request.body
            await updateBoard({ boardId, name, accessPolicy })
            return ok({ ok: true })
        }),
    )

// TODO: require API_TOKEN header for github too!
/**
 * GitHub webhook
 *
 * @tags Webhooks
 */
const githubWebhook = route
    .post("/api/v1/webhook/github/:boardId")
    .use(
        body(
            t.partial({
                issue: t.type({
                    html_url: t.string,
                    title: t.string,
                    number: t.number,
                    state: t.string,
                    labels: t.array(t.type({ name: t.string })),
                }),
            }),
        ),
    )
    .handler(async (request) => {
        try {
            const boardId = request.routeParams.boardId
            const body = request.body
            const board = await getBoard(boardId)
            if (!board) {
                console.warn(`Github webhook call for unknown board ${boardId}`)
                return ok()
            }
            if (body.issue) {
                const url = body.issue.html_url
                const title = body.issue.title
                const number = body.issue.number.toString()
                const state = body.issue.state
                if (state !== "open") {
                    console.log(`Github webhook call board ${boardId}: Item in ${state} state`)
                } else {
                    const linkStart = `<a href=${url}>`
                    const linkHTML = `${linkStart}${htmlEncode(number)}</a> ${htmlEncode(title)}`
                    const existingItem = Object.values(board.board.items).find(
                        (i) => i.type === "note" && i.text.includes(url),
                    ) as Note | undefined
                    const isBug = body.issue.labels.some((l) => l.name === "bug")
                    const color = isBug ? RED : YELLOW
                    if (!existingItem) {
                        console.log(`Github webhook call board ${boardId}: New item`)
                        addItem(board, "note", linkHTML, color, "New issues")
                    } else {
                        console.log(`Github webhook call board ${boardId}: Item exists`)
                        const updatedItem: Note = { ...existingItem, color }
                        dispatchSystemAppEvent(board, { action: "item.update", boardId, items: [updatedItem] })
                    }
                }
            }
            return ok()
        } catch (e) {
            console.error(e)
            if (e instanceof InvalidRequest) {
                return badRequest(e.message)
            } else {
                return internalServerError()
            }
        }
    })

/**
 * Creates a new item on given board. If you want to add the item onto a
 * specific area/container element on the board, you can find the id of the
 * container by inspecting with your browser.
 *
 * @tags Board
 */
const itemCreate = route
    .post("/api/v1/board/:boardId/item")
    .use(
        apiTokenHeader,
        body(t.type({ type: t.literal("note"), text: t.string, color: t.string, container: t.string })),
    )
    .handler((request) =>
        checkBoardAPIAccess(request, async (board) => {
            const { type, text, color, container } = request.body
            console.log(`POST item for board ${board.board.id}: ${JSON.stringify(request.req.body)}`)
            addItem(board, type, text, color, container)
            return ok({ ok: true })
        }),
    )

/**
 * List the history of a board
 *
 * @tags Board
 */
const historyGet = route
    .get("/api/v1/board/:boardId/history")
    .use(apiTokenHeader)
    .handler((request) =>
        checkBoardAPIAccess(request, async (board) => {
            const history = await withDBClient((client) => getFullBoardHistory(board.board.id, client))
            return ok({ history })
        }),
    )

/**
 * Creates a new item on given board or updates an existing one.
 * If you want to add the item onto a specific area/container element on the board, you can
 * find the id of the container by inspecting with your browser.
 *
 * @tags Board
 */
const itemCreateOrUpdate = route
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

export default router(boardCreate, boardUpdate, githubWebhook, itemCreate, itemCreateOrUpdate, historyGet)

// Utils

class InvalidRequest extends Error {
    constructor(message: string) {
        super(message)
    }
}

async function checkBoardAPIAccess<T>(
    request: { routeParams: { boardId: string }; headers: { API_TOKEN?: string | undefined } },
    fn: (board: ServerSideBoardState) => Promise<T>,
) {
    const boardId = request.routeParams.boardId
    const apiToken = request.headers.API_TOKEN
    try {
        const board = await getBoard(boardId)
        if (!board) return notFound()
        if (board.board.accessPolicy || board.accessTokens.length) {
            if (!apiToken) {
                return badRequest("API_TOKEN header is missing")
            }
            if (!board.accessTokens.some((t) => t === apiToken)) {
                console.log(`API_TOKEN ${apiToken} not on list ${board.accessTokens}`)
                return badRequest("Invalid API_TOKEN")
            }
        }
        return await fn(board)
    } catch (e) {
        console.error(e)
        if (e instanceof InvalidRequest) {
            return badRequest(e.message)
        } else {
            return internalServerError()
        }
    }
}

function findContainer(container: string | undefined, board: Board): Container | null {
    if (container !== undefined) {
        if (typeof container !== "string") {
            throw new InvalidRequest("Expecting container to be undefined, or an id or name of an Container item")
        }
        const containerItem = Object.values(board.items).find(
            (i) => i.type === "container" && (i.text.toLowerCase() === container.toLowerCase() || i.id === container),
        )
        if (!containerItem) {
            throw new InvalidRequest(`Container "${container}" not found by id or name`)
        }
        return containerItem as Container
    } else {
        return null
    }
}

function getItemAttributesForContainer(container: string | undefined, board: Board) {
    const containerItem = findContainer(container, board)
    if (containerItem) {
        return {
            containedId: containerItem.id,
            x: containerItem.x + 2,
            y: containerItem.y + 2,
        }
    }
    return {}
}

function addItem(
    board: ServerSideBoardState,
    type: "note",
    text: string,
    color: Color,
    container: string | undefined,
    itemId?: string,
) {
    if (type !== "note") throw new InvalidRequest("Expecting type: note")
    if (typeof text !== "string" || text.length === 0) throw new InvalidRequest("Expecting non zero-length text")

    let itemAttributes: object = getItemAttributesForContainer(container, board.board)
    if (itemId) itemAttributes = { ...itemAttributes, id: itemId }

    const item: Note = { ...newNote(text, color || YELLOW), ...itemAttributes }
    const appEvent: AppEvent = { action: "item.add", boardId: board.board.id, items: [item] }
    dispatchSystemAppEvent(board, appEvent)
}

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

function dispatchSystemAppEvent(board: ServerSideBoardState, appEvent: PersistableBoardItemEvent) {
    const user: EventUserInfo = { userType: "system", nickname: "Github webhook" }
    let historyEntry: BoardHistoryEntry = { ...appEvent, user, timestamp: new Date().toISOString() }
    console.log(JSON.stringify(historyEntry))
    // TODO: refactor, this is the same sequence as done in connection-handler for messages from clients
    const serial = updateBoards(board, historyEntry)
    historyEntry = { ...historyEntry, serial }
    broadcastBoardEvent(historyEntry)
}
