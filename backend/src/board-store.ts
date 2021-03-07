import { PoolClient } from "pg"
import { boardReducer } from "../../common/src/board-reducer"
import { Board, BoardAccessPolicy, BoardHistoryEntry, exampleBoard, Id, Serial } from "../../common/src/domain"
import { inTransaction, withDBClient } from "./db"
import * as uuid from "uuid"

export type BoardAndAccessTokens = {
    board: Board
    accessTokens: string[]
}

export async function fetchBoard(id: Id): Promise<BoardAndAccessTokens> {
    return await inTransaction(async (client) => {
        const result = await client.query("SELECT content, history FROM board WHERE id=$1", [id])
        if (result.rows.length == 0) {
            if (id === exampleBoard.id) {
                // Example board is a special case: it is automatically created if not in DB yet.
                const board = { ...exampleBoard, serial: 0 }
                await createBoard(board)
                return { board, accessTokens: [] }
            } else {
                throw Error(`Board ${id} not found`)
            }
        } else {
            const snapshot = result.rows[0].content as Board
            const legacyHistory = result.rows[0].history.history || []
            if (legacyHistory.length) {
                await migrateLegacyHistory(id, legacyHistory, client)
            }
            let history: BoardHistoryEntry[]
            let initialBoard: Board
            if (snapshot.serial) {
                try {
                    console.log("Loading history for board with snapshot at serial " + snapshot.serial)
                    history = await getBoardHistory(id, snapshot.serial)
                    console.log("Got history for board with snapshot at serial " + snapshot.serial)
                    //console.log( `Fetching partial history for board ${id}, starting at serial ${snapshot.serial}, consisting of ${history.length} events`, )
                    initialBoard = snapshot
                } catch (e) {
                    console.error(
                        `Error fetching board history for snapshot update for board ${id}. Rebooting snaphot...`,
                    )
                    history = await getFullBoardHistory(id, client)
                    initialBoard = { ...snapshot, items: [] }
                }
            } else {
                console.warn(`Found legacy board snapshot for ${id}. You should not see this message.`) // TODO remove this legacy branch
                history = await getFullBoardHistory(id, client)
                console.log(`Fetched full history for board ${id}, consisting of ${history.length} events`)
                initialBoard = { ...snapshot, items: [] }
            }
            const board = history.reduce((b, e) => boardReducer(b, e)[0], initialBoard)
            const serial = (history.length > 0 ? history[history.length - 1].serial : snapshot.serial) || 0
            if (history.length > 1000 || serial == 1 || !snapshot.serial /* rebooted */) {
                console.log(`Saving snapshot history ${history.length} serial ${serial}/${snapshot.serial}`)
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

async function migrateLegacyHistory(id: Id, history: BoardHistoryEntry[], client: PoolClient) {
    if (history.length > 0) {
        console.log(`Migrating event history for board ${id}, consisting of ${history.length} events`)
        await storeEventHistoryBundle(id, history, client)
        await client.query(`UPDATE board SET history='{}' WHERE board.id=$1`, [id])

        console.log(
            `Migrated event history of board ${id} with serials ${history[0].serial}..${
                history[history.length - 1].serial
            }`,
        )
    }
}

export async function getFullBoardHistory(id: Id, client: PoolClient): Promise<BoardHistoryEntry[]> {
    return (
        await client.query(`SELECT events FROM board_event WHERE board_id=$1 ORDER BY last_serial`, [id])
    ).rows.flatMap((row) => row.events.events as BoardHistoryEntry[])
}

export async function getBoardHistory(id: Id, afterSerial: Serial): Promise<BoardHistoryEntry[]> {
    return withDBClient(async (client) => {
        const historyEventsIncludingLatest = (
            await client.query(
                `SELECT events FROM board_event WHERE board_id=$1 AND last_serial >= $2 ORDER BY last_serial`,
                [id, afterSerial],
            )
        ).rows.flatMap((row) => row.events.events as BoardHistoryEntry[])

        const historyEvents = historyEventsIncludingLatest.filter((e) => e.serial! > afterSerial)

        //console.log( `Fetched board history for board ${id} after serial ${afterSerial} -> ${historyEvents.length} events`, )
        if (historyEvents.length === 0) {
            if (historyEventsIncludingLatest.length === 0) {
                throw Error(
                    `Cannot find history to start after the requested serial ${afterSerial} for board ${id}. Seems like the requested serial is higher than currently stored in DB`,
                )
            }
            return historyEvents
        }
        if (historyEvents[0].serial === afterSerial + 1) {
            return historyEvents
        }

        throw Error(
            `Cannot find history to start after the requested serial ${afterSerial} for board ${id}. Found history for ${
                historyEvents[0].serial
            }..${historyEvents[historyEvents.length - 1].serial}`,
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
    return { ...board, serial }
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
