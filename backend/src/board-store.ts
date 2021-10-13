import { PoolClient } from "pg"
import QueryStream from "pg-query-stream"
import { boardReducer } from "../../common/src/board-reducer"
import {
    Board,
    BoardAccessPolicy,
    BoardHistoryEntry,
    exampleBoard,
    Id,
    isBoardEmpty,
    Serial,
} from "../../common/src/domain"
import { migrateBoard, mkBootStrapEvent } from "../../common/src/migration"
import { inTransaction, withDBClient } from "./db"
import * as uuid from "uuid"

export type BoardAndAccessTokens = {
    board: Board
    accessTokens: string[]
}

export type BoardInfo = {
    id: Id
    name: string
    ws_host: string | null
}

export async function getBoardInfo(id: Id): Promise<BoardInfo | null> {
    const result = await withDBClient((client) => client.query("SELECT id, name, ws_host FROM board WHERE id=$1", [id]))
    return result.rows.length === 1 ? (result.rows[0] as BoardInfo) : null
}

export async function fetchBoard(id: Id): Promise<BoardAndAccessTokens | null> {
    return await inTransaction(async (client) => {
        const result = await client.query("SELECT content FROM board WHERE id=$1", [id])
        if (result.rows.length == 0) {
            return null
        } else {
            const snapshot = result.rows[0].content as Board
            let historyEventCount = 0
            let lastSerial = 0
            let board = snapshot

            function updateBoardWithEventChunk(chunk: BoardHistoryEntry[]) {
                board = chunk.reduce((b, e) => boardReducer(b, e)[0], board)
                historyEventCount += chunk.length
                lastSerial = chunk[chunk.length - 1].serial ?? snapshot.serial
            }

            console.log("Loading history for board with snapshot at serial " + snapshot.serial)
            await getBoardHistory(id, snapshot.serial, updateBoardWithEventChunk).catch((error) => {
                console.error(error.message)
                console.error(`Error fetching board history for snapshot update for board ${id}. Rebooting snapshot...`)
                board = { ...snapshot, items: {}, connections: [] }
                return getFullBoardHistory(id, client, updateBoardWithEventChunk)
            })

            const serial = (historyEventCount > 0 ? lastSerial : snapshot.serial) || 0
            if (historyEventCount > 1000 || serial == 1 || !snapshot.serial /* rebooted */) {
                console.log(`Saving snapshot history ${historyEventCount} serial ${serial}/${snapshot.serial}`)
                await saveBoardSnapshot(mkSnapshot(board, serial), client)
            }
            const accessTokens = (
                await client.query("SELECT token FROM board_api_token WHERE board_id=$1", [id])
            ).rows.map((row) => row.token)
            console.log(`Board loaded`)
            return { board: { ...board, serial }, accessTokens }
        }
    })
}

export async function createBoard(board: Board): Promise<void> {
    await inTransaction(async (client) => {
        const result = await client.query("SELECT id FROM board WHERE id=$1", [board.id])
        if (result.rows.length > 0) throw Error("Board already exists: " + board.id)
        client.query(`INSERT INTO board(id, name, content) VALUES ($1, $2, $3)`, [
            board.id,
            board.name,
            mkSnapshot(board, 0),
        ])

        if (!isBoardEmpty(board)) {
            console.log(`Creating non-empty board ${board.id} -> bootstrapping history`)
            storeEventHistoryBundle(board.id, [mkBootStrapEvent(board.id, board)], client)
        }
    })
}

export async function updateBoard({
    boardId,
    name,
    accessPolicy,
}: {
    boardId: Id
    name: string
    accessPolicy?: BoardAccessPolicy
}) {
    await inTransaction(async (client) => {
        const result = await client.query("SELECT content FROM board WHERE id=$1", [boardId])
        if (result.rows.length !== 1) throw Error("Board not found: " + boardId)
        let content = result.rows[0].content
        if (name) {
            content = { ...content, name }
        } else {
            name = content.name
        }
        if (accessPolicy) content = { ...content, accessPolicy }
        await client.query("UPDATE board SET content=$1, name=$2 WHERE id=$3", [content, name, boardId])
    })
}

export async function createAccessToken(board: Board): Promise<string> {
    const token = uuid.v4()
    await inTransaction(async (client) =>
        client.query("INSERT INTO board_api_token (board_id, token) VALUES ($1, $2)", [board.id, token]),
    )
    return token
}

export async function saveRecentEvents(id: Id, recentEvents: BoardHistoryEntry[]) {
    await inTransaction(async (client) => storeEventHistoryBundle(id, recentEvents, client))
}

type StreamingBoardEventCallback = (chunk: BoardHistoryEntry[]) => void

// Due to memory concerns we fetch board histories from DB as chunks,
// which are currently implemented as sort of a poor-man's observable
function streamingBoardEventsQuery(text: string, values: any[], client: PoolClient, cb: StreamingBoardEventCallback) {
    return new Promise((resolve, reject) => {
        const query = new QueryStream(text, values)
        const stream = client.query(query)
        stream.on("error", reject)
        stream.on("end", resolve)
        stream.on("data", (row) => {
            try {
                const chunk = row.events?.events as BoardHistoryEntry[] | undefined

                if (!chunk) {
                    throw Error(`Unexpected DB row value ${chunk}`)
                }

                cb(chunk)
            } catch (error) {
                console.error(error)
                stream.destroy()
                reject(error)
            }
        })
    })
}

export function getFullBoardHistory(id: Id, client: PoolClient, cb: StreamingBoardEventCallback) {
    return streamingBoardEventsQuery(
        `SELECT events FROM board_event WHERE board_id=$1 ORDER BY last_serial`,
        [id],
        client,
        cb,
    )
}

export async function getBoardHistory(id: Id, afterSerial: Serial, cb: StreamingBoardEventCallback): Promise<void> {
    await withDBClient(async (client) => {
        let firstSerial = -1
        let lastSerial = -1
        let firstValidSerial = -1
        await streamingBoardEventsQuery(
            `SELECT events FROM board_event WHERE board_id=$1 AND last_serial >= $2 ORDER BY last_serial`,
            [id, afterSerial],
            client,
            (chunk) => {
                if (firstSerial === -1 && typeof chunk[0]?.serial === "number") {
                    firstSerial = chunk[0]?.serial
                }
                lastSerial = chunk[chunk.length - 1].serial ?? -1

                const validEventsAfter = chunk.filter((r) => r.serial! > afterSerial)
                if (validEventsAfter.length === 0) {
                    // Got chunk where no events have serial greater than the snapshot point -- discard it
                    return
                }

                if (firstValidSerial === -1 && typeof validEventsAfter[0].serial === "number") {
                    firstValidSerial = validEventsAfter[0].serial
                }
                cb(validEventsAfter)
                return
            },
        )

        // Client is up to date, ok
        if (lastSerial === afterSerial) {
            return
        }

        // Found continuous history, ok
        if (firstValidSerial === afterSerial + 1) {
            return
        }

        // Client claims to be in the future, not ok
        if (firstValidSerial === -1) {
            throw Error(
                `Cannot find history to start after the requested serial ${afterSerial} for board ${id}. Seems like the requested serial is higher than currently stored in DB`,
            )
        }

        // Found noncontinuous event timeline, not ok
        throw Error(
            `Cannot find history to start after the requested serial ${afterSerial} for board ${id}. Found history for ${firstValidSerial}..${lastSerial}`,
        )
    })
}

export function verifyContinuity(boardId: Id, init: Serial, ...histories: BoardHistoryEntry[][]) {
    for (let history of histories) {
        if (history.length > 0) {
            if (!verifyTwoPoints(boardId, init, history[0].serial!)) {
                return false
            }
            init = history[history.length - 1].serial!
        }
    }
    return true
}
function verifyTwoPoints(boardId: Id, a: Serial, b: Serial) {
    if (b !== a + 1) {
        console.error(`History discontinuity: ${a} -> ${b} for board ${boardId}`)
        return false
    }
    return true
}

export function mkSnapshot(board: Board, serial: Serial) {
    return migrateBoard({ ...board, serial })
}

export async function saveBoardSnapshot(board: Board, client: PoolClient) {
    console.log(`Save board snapshot ${board.id} at serial ${board.serial}`)
    client.query(`UPDATE board set name=$2, content=$3 WHERE id=$1`, [board.id, board.name, board])
}

export async function storeEventHistoryBundle(boardId: Id, events: BoardHistoryEntry[], client: PoolClient) {
    if (events.length > 0) {
        const lastSerial = events[events.length - 1].serial || 0 // default to zero for legacy events. db constraint will prevent inserting two bundles with the same serial
        await client.query(`INSERT INTO board_event(board_id, last_serial, events) VALUES ($1, $2, $3)`, [
            boardId,
            lastSerial,
            { events },
        ])
    }
}

export type BoardHistoryBundle = {
    board_id: Id
    last_serial: Serial
    events: {
        events: BoardHistoryEntry[]
    }
}

export async function getBoardHistoryBundles(client: PoolClient, id: Id): Promise<BoardHistoryBundle[]> {
    return (
        await client.query(
            `SELECT board_id, last_serial, events FROM board_event WHERE board_id=$1 ORDER BY last_serial`,
            [id],
        )
    ).rows
}

export async function findAllBoards(client: PoolClient): Promise<Id[]> {
    const result = await client.query("SELECT id FROM board")
    return result.rows.map((row) => row.id)
}
