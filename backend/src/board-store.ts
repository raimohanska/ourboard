import { PoolClient } from "pg"
import QueryStream from "pg-query-stream"
import * as uuid from "uuid"
import { boardReducer } from "../../common/src/board-reducer"
import { Board, BoardAccessPolicy, BoardHistoryEntry, Id, isBoardEmpty, Serial } from "../../common/src/domain"
import { migrateBoard, migrateEvent, mkBootStrapEvent } from "../../common/src/migration"
import { inTransaction, withDBClient } from "./db"
import { assertNotNull } from "../../common/src/assertNotNull"

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

const selectBoardQuery = `
select id,
    jsonb_set (content - 'accessPolicy', '{accessPolicy}', 
    		cast(json_build_object(
    			'allowList', (    			
    				coalesce((
					  select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('domain', domain, 'access', access, 'email', email))) 
					  from board_access
					  where board_access.board_id = board.id
					), '[]')    			
    			), 
    			'publicRead', public_read, 
    			'publicWrite', public_write
    		) as jsonb)) 
    		as content
from board
where id=$1
`

export async function fetchBoard(id: Id): Promise<BoardAndAccessTokens | null> {
    return await inTransaction(async (client) => {
        const started = new Date().getTime()
        const result = await client.query(selectBoardQuery, [id])
        if (result.rows.length == 0) {
            return null
        } else {
            const snapshot = result.rows[0].content as Board
            if (
                snapshot.accessPolicy &&
                snapshot.accessPolicy.allowList.length === 0 &&
                snapshot.accessPolicy.publicRead &&
                snapshot.accessPolicy.publicWrite
            ) {
                // Effectively no access policy
                delete snapshot.accessPolicy
            }
            let historyEventCount = 0
            let lastSerial = 0
            let board = snapshot

            let i = 0
            let rebuildingSnapshot = false
            function updateBoardWithEventChunk(chunk: BoardHistoryEntry[]) {
                if (chunk.length === 0) {
                    return // CRDT-only bundle
                }
                board = chunk.reduce((b, e) => {
                    i++
                    if (e.action === "board.setAccessPolicy") {
                        // Don't process access policy event when fetching board
                        // Access policy may have been changed in the database after the event
                        // And the board table status is considered the master
                        return { ...b, serial: assertNotNull(e.serial) }
                    }
                    return boardReducer(b, e, { inplace: true, strictOnSerials: !rebuildingSnapshot })[0]
                }, board)
                historyEventCount += chunk.length
                lastSerial = chunk[chunk.length - 1].serial ?? snapshot.serial
            }

            await getBoardHistory(id, snapshot.serial, updateBoardWithEventChunk).catch(async (error) => {
                console.error(error.message)
                console.error(
                    `Error applying board history for snapshot update for board ${id}. Loop index ${i}. Rebooting snapshot. This may be a lossy operation.`,
                )
                i = 0
                board = { ...snapshot, items: {}, connections: [] }
                rebuildingSnapshot = true
                try {
                    await getFullBoardHistory(id, client, updateBoardWithEventChunk)
                } catch (e) {
                    console.error(`Unable to reboot snapshot, failing at loop index ${i}. Giving up.`)

                    // TODO: this board cannot be repaired automatically. We should block usage, or it will be
                    // and endless loop. Local dev, board ee803db1-f41a-43c6-9e39-83057faace60.

                    throw e
                }
            })

            const serial = (historyEventCount > 0 ? lastSerial : snapshot.serial) || 0
            const elapsed = new Date().getTime() - started
            console.log(
                `Loaded board ${id} at serial ${serial} from snapshot at serial ${snapshot.serial} and ${historyEventCount} events after snapshot. Took ${elapsed}ms`,
            )

            if (historyEventCount > 1000 || rebuildingSnapshot /* time to create a new snapshot*/) {
                console.log(
                    `Saving snapshot for board ${id} at serial ${serial}/${snapshot.serial} with ${historyEventCount} new events`,
                )
                await saveBoardSnapshot(mkSnapshot(board, serial), client)
            }
            const accessTokens = (
                await client.query("SELECT token FROM board_api_token WHERE board_id=$1", [id])
            ).rows.map((row) => row.token)

            return { board: { ...board, serial }, accessTokens }
        }
    })
}

export async function createBoard(board: Board): Promise<void> {
    await inTransaction(async (client) => {
        const result = await client.query("SELECT id FROM board WHERE id=$1", [board.id])
        if (result.rows.length > 0) throw Error("Board already exists: " + board.id)
        await client.query(`INSERT INTO board(id, name, content) VALUES ($1, $2, $3)`, [
            board.id,
            board.name,
            mkSnapshot(board, 0),
        ])

        await updateAccessPolicy(board.id, board.accessPolicy, client)

        if (!isBoardEmpty(board)) {
            console.log(`Creating non-empty board ${board.id} -> bootstrapping history`)
            const event = mkBootStrapEvent(board.id, board)
            storeEventHistoryBundle(board.id, [event], event.serial!, null, client)
        }
    })
}

async function updateAccessPolicy(boardId: string, accessPolicy: BoardAccessPolicy, client: PoolClient): Promise<void> {
    const publicRead = accessPolicy ? !!accessPolicy.publicRead : true
    const publicWrite = accessPolicy ? !!accessPolicy.publicWrite : true
    await client.query(`UPDATE board SET public_read=$1, public_write=$2 WHERE id=$3`, [
        publicRead,
        publicWrite,
        boardId,
    ])
    await client.query(`DELETE FROM board_access WHERE board_id=$1`, [boardId])
    if (accessPolicy) {
        for (const entry of accessPolicy.allowList) {
            const domain = "domain" in entry ? entry.domain : null
            const email = "email" in entry ? entry.email : null
            await client.query(`INSERT INTO BOARD_access (board_id, domain, email, access) VALUES ($1, $2, $3, $4)`, [
                boardId,
                domain,
                email,
                entry.access,
            ])
        }
    }
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
        await updateAccessPolicy(boardId, accessPolicy, client)
    })
}

export async function createAccessToken(board: Board): Promise<string> {
    const token = uuid.v4()
    await inTransaction(async (client) =>
        client.query("INSERT INTO board_api_token (board_id, token) VALUES ($1, $2)", [board.id, token]),
    )
    return token
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

                cb(chunk.map(migrateEvent))
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
        `
        SELECT events 
        FROM board_event 
        WHERE board_id=$1 
        ORDER BY last_serial
        `,
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
            `
            SELECT events 
            FROM board_event 
            WHERE board_id=$1 AND last_serial >= $2 
            ORDER BY last_serial
            `,
            [id, afterSerial],
            client,
            (chunk) => {
                if (chunk.length === 0) {
                    return // CRDT-only bundle
                }
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

        if (firstValidSerial === -1) {
            if (afterSerial === 0) {
                // Requesting from start, zero events found, is ok
                return
            }
            // Client claims to be in the future, not ok
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

export function verifyEventArrayContinuity(boardId: Id, init: Serial, events: BoardHistoryEntry[]) {
    for (let event of events) {
        if (!verifyTwoPoints(boardId, init, event.serial!)) {
            return false
        }
        init = event.serial!
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

function mkSnapshot(board: Board, serial: Serial) {
    const { accessPolicy, ...result } = migrateBoard({ ...board, serial })
    return result
}

export async function saveBoardSnapshot(board: Board, client: PoolClient) {
    console.log(`Save board snapshot ${board.id} at serial ${board.serial}`)
    client.query(
        `
    UPDATE board 
    SET name=$2, content=$3 
    WHERE id=$1`,
        [board.id, board.name, board],
    )
}

export async function storeEventHistoryBundle(
    boardId: Id,
    events: BoardHistoryEntry[],
    lastSerial: Serial, // Needed in case events is empty
    crdtUpdate: Uint8Array | null,
    client: PoolClient,
    savedAt = new Date(),
) {
    if (events.length === 0 && crdtUpdate === null) {
        throw Error("Trying to store a bundle without events or crdtUpdate")
    }
    if (events[0]?.firstSerial !== undefined) {
        throw Error("Assertion failed: folded events not expected on the server side.")
    }
    const firstSerial = events.length > 0 ? assertNotNull(events[0].serial) : null
    if (events.length > 0 && events[events.length - 1].serial != lastSerial) {
        throw Error("Serial mismatch between lastSerial and lastEvent.serial")
    }
    await client.query(
        `
        INSERT INTO board_event(board_id, first_serial, last_serial, events, crdt_update, saved_at) 
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [boardId, firstSerial, lastSerial, { events }, crdtUpdate, savedAt],
    )
}

export async function storeCRDTOnlyEventHistoryBundle(
    boardId: Id,
    boardSerial: Serial,
    crdtUpdate: Uint8Array | null,
    client: PoolClient,
    savedAt = new Date(),
) {
    await client.query(
        `
        INSERT INTO board_event(board_id, first_serial, last_serial, events, crdt_update, saved_at) 
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [boardId, null, boardSerial, null, crdtUpdate, savedAt],
    )
}

export type BoardHistoryBundle = {
    board_id: Id
    last_serial: Serial
    events: {
        events: BoardHistoryEntry[]
    }
    crdt_update: Uint8Array | null
}

export async function getBoardHistoryBundlesWithLastSerialsBetween(
    client: PoolClient,
    id: Id,
    lsMin: Serial,
    lsMax: Serial,
): Promise<BoardHistoryBundle[]> {
    return (
        await client.query(
            `
            SELECT board_id, last_serial, events, crdt_update 
            FROM board_event 
            WHERE board_id=$1 AND last_serial >= $2 AND last_serial <= $3 
            ORDER BY last_serial
            `,
            [id, lsMin, lsMax],
        )
    ).rows.map(migrateBundle)
}

export async function getBoardHistoryCrdtUpdates(client: PoolClient, id: Id): Promise<Uint8Array[]> {
    return (
        await client.query(
            `
            SELECT crdt_update 
            FROM board_event 
            WHERE board_id=$1 AND crdt_update IS NOT NULL 
            ORDER BY last_serial
            `,
            [id],
        )
    ).rows.map((row) => row.crdt_update)
}

function migrateBundle(b: BoardHistoryBundle): BoardHistoryBundle {
    return { ...b, events: { ...b.events, events: b.events.events.map(migrateEvent) } }
}

export type BoardHistoryBundleMeta = {
    board_id: Id
    first_serial: Serial | null
    last_serial: Serial
    saved_at: Date
}

export async function getBoardHistoryBundleMetas(client: PoolClient, id: Id): Promise<BoardHistoryBundleMeta[]> {
    return (
        await client.query(
            `
            SELECT board_id, last_serial, first_serial, saved_at 
            FROM board_event 
            WHERE board_id=$1 
            ORDER BY last_serial
            `,
            [id],
        )
    ).rows
}

export function verifyContinuityFromMetas(boardId: Id, init: Serial, bundles: BoardHistoryBundleMeta[]) {
    for (let bundle of bundles) {
        if (!bundle.first_serial) {
            // CRDT only bundle
            if (bundle.last_serial !== init) {
                console.error(
                    `History discontinuity:  ${init} -> ${bundle.last_serial} for CRDT-only bundle for board ${boardId}`,
                )
                return false
            }
        } else {
            if (!verifyTwoPoints(boardId, init, bundle.first_serial)) {
                return false
            }
            init = bundle.last_serial
        }
    }
    return true
}

export async function findAllBoards(client: PoolClient): Promise<Id[]> {
    const result = await client.query("SELECT id FROM board")
    return result.rows.map((row) => row.id)
}
