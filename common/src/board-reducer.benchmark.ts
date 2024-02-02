import _ from "lodash"
import { NOTE_COLORS } from "./colors"
import { Board } from "./domain"
import * as uuid from "uuid"
import { boardReducer } from "./board-reducer"
import { assertNotNull } from "./assertNotNull"

function createBoard(): Board {
    const itemCount = 10000
    const board: Board = {
        id: "0f5b9d6c-02c2-4b81-beb7-3a3b9035e8a2",
        name: "Perf3",
        width: 800,
        height: 600,
        serial: 320577,
        connections: [],
        items: {},
    }
    for (let i = 0; i < itemCount; i++) {
        const id = uuid.v4()
        board.items[id] = {
            id,
            type: "text",
            x: Math.random() * 800,
            y: Math.random() * 600,
            z: 3,
            width: 5,
            height: 5,
            text: "Hello world",
            fontSize: 12,
            locked: false,
            color: "#FBFC86",
        }
    }
    return board
}

const board = createBoard()
const boardId = board.id
const eventCount = 1000
const items = Object.values(board.items)

const started = new Date().getTime()
for (let i = 0; i < eventCount; i++) {
    const target = assertNotNull(_.sample(items))
    const updated = { ...target, text: "EDIT " + i, color: _.sample(NOTE_COLORS)?.color! }

    boardReducer(
        board,
        {
            action: "item.update",
            boardId,
            items: [updated],
        },
        { inplace: true },
    )
}
const elapsed = new Date().getTime() - started
console.log(`Processed ${eventCount} events in ${elapsed}ms. (${eventCount / elapsed} events/ms)`)
