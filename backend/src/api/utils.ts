import * as bodyParser from "body-parser"
import * as t from "io-ts"
import { badRequest, internalServerError, notFound } from "typera-common/response"
import { applyMiddleware } from "typera-express"
import { wrapNative } from "typera-express/middleware"
import { headers } from "typera-express/parser"
import { YELLOW } from "../../../common/src/colors"
import {
    AppEvent,
    Board,
    BoardHistoryEntry,
    Color,
    Container,
    EventUserInfo,
    newNote,
    Note,
    PersistableBoardItemEvent,
} from "../../../common/src/domain"
import { getBoard, ServerSideBoardState, updateBoards } from "../board-state"
import { broadcastBoardEvent } from "../sessions"

export const route = applyMiddleware(wrapNative(bodyParser.json()))
export const apiTokenHeader = headers(t.partial({ API_TOKEN: t.string }))

export async function checkBoardAPIAccess<T>(
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

export function findContainer(container: string | undefined, board: Board): Container | null {
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

export function getItemAttributesForContainer(container: string | undefined, board: Board) {
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

export function dispatchSystemAppEvent(board: ServerSideBoardState, appEvent: PersistableBoardItemEvent) {
    const user: EventUserInfo = { userType: "system", nickname: "Github webhook" }
    let historyEntry: BoardHistoryEntry = { ...appEvent, user, timestamp: new Date().toISOString() }
    console.log(JSON.stringify(historyEntry))
    // TODO: refactor, this is the same sequence as done in connection-handler for messages from clients
    const serial = updateBoards(board, historyEntry)
    historyEntry = { ...historyEntry, serial }
    broadcastBoardEvent(historyEntry)
}

export function addItem(
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
    const appEvent: AppEvent = { action: "item.add", boardId: board.board.id, items: [item], connections: [] }
    dispatchSystemAppEvent(board, appEvent)
}

export class InvalidRequest extends Error {
    constructor(message: string) {
        super(message)
    }
}
