import { encode as htmlEncode } from "html-entities"
import * as t from "io-ts"
import { badRequest, internalServerError, ok } from "typera-common/response"
import { body } from "typera-express/parser"
import { RED, YELLOW } from "../../../common/src/colors"
import { Note } from "../../../common/src/domain"
import { getBoard } from "../board-state"
import { addItem, dispatchSystemAppEvent, InvalidRequest, route } from "./utils"

// TODO: require API_TOKEN header for github too!
/**
 * GitHub webhook
 *
 * @tags Webhooks
 */
export const githubWebhook = route
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
