import {
    findAllBoards,
    getBoardHistoryBundles,
    verifyContinuity,
    storeEventHistoryBundle,
    mkSnapshot,
    saveBoardSnapshot,
} from "./board-store"
import { withDBClient, inTransaction } from "./db"
import _ from "lodash"
import { Board, BoardHistoryEntry, Id } from "../../common/src/domain"
import { format } from "date-fns"
import { boardReducer } from "../../common/src/board-reducer"
import { PoolClient } from "pg"
import { mkBootStrapEvent, migrateBoard } from "../../common/src/migration"

// TODO: there are now some incomplete/inconsistent histories in production.
//    Analyze and re-bootstrap them into consistency. This tool could do it!
//    Fix is possible if there's a snapshot with a serial.
// TODO: verify further with boardReducer
export function compactBoardHistory(id: Id) {
    return inTransaction(async (client) => {
        const bundles = await getBoardHistoryBundles(client, id)
        const eventArrays = bundles.map((b) => b.events.events)
        const consistent = verifyContinuity(id, 0, ...eventArrays)
        const events: BoardHistoryEntry[] = eventArrays.flat()
        if (consistent) {
            const groups = Object.values(_.groupBy(events, (e) => Math.floor(e.serial! / 1000)))
            const sorted: DateBundle[] = []
            let current: DateBundle | null = null
            type DateBundle = { date: string; events: BoardHistoryEntry[] }
            for (let event of events) {
                const date = format(new Date(event.timestamp), "yyyy-MM-dd hh")
                if (current == null || date !== current.date) {
                    if (current !== null) {
                        sorted.push(current)
                    }
                    current = { events: [], date }
                }
                current.events.push(event)
            }
            if (current != null) {
                sorted.push(current)
            }
            const compactedOk = verifyContinuity(id, 0, ...sorted.map((e) => e.events))
            if (!compactedOk || sorted.flatMap((e) => e.events).length !== events.length) {
                throw Error("Compaction failure")
            }
            if (sorted.length === bundles.length) {
                console.log(
                    `Board ${id}: Verified ${bundles.length} bundles containing ${events.length} events => no need to compact`,
                )
                return
            }
            console.log(
                `Board ${id}: Verified ${bundles.length} bundles containing ${events.length} events => compacting to ${sorted.length} bundles`,
            )
            //console.log(sorted.map(s => s.date).join("\n  "))

            const serials = bundles.map((b) => b.last_serial!)
            const result = await client.query(
                `DELETE FROM board_event where board_id=$1 and last_serial in (${serials.join(",")})`,
                [id],
            )
            if (result.rowCount != serials.length) {
                throw Error(`Unexpected rowcount ${result.rowCount} for board ${id}`)
            }
            for (let newBundle of sorted) {
                await storeEventHistoryBundle(id, newBundle.events, client)
            }
        } else {
            console.warn(`Aborting compaction of board ${id} due to inconsistent history`)
            const result = await client.query("SELECT content, history FROM board WHERE id=$1", [id])
            if (result.rowCount != 1) {
                console.warn("Board not found!?")
                return
            }
            const snapshot = result.rows[0].content as Board
            if (snapshot.serial) {
                console.log(`Found snapshot at serial ${snapshot.serial}`)

                const followingEvents = events.filter((e) => e.serial! > snapshot.serial)

                if (followingEvents.length > 0 && followingEvents[0].serial !== snapshot.serial + 1) {
                    console.log(
                        `Cannot find a consecutive event for snapshot. First event is ${followingEvents[0]?.serial}`,
                    )
                } else {
                    console.log("Bootstraping history based on snapshot")
                    await bootstrapHistory(id, snapshot, followingEvents, client)
                }
            } else {
                console.warn("No snapshot with serial available discarding history and bootstrapping to latest state.")
                await bootstrapHistory(id, mkSnapshot(snapshot, 0), [], client)
            }
        }
    })
}

// TODO: should re-serialize events as well to make it consistent. Then the clients should somehow detect that their serial is ahead and start from scratch. Otherwise they'll ignore future events
async function bootstrapHistory(boardId: Id, snap: Board, events: BoardHistoryEntry[], client: PoolClient) {
    const board = migrateBoard(events.reduce((b, e) => boardReducer(b, e)[0], snap))

    const bootstrappedHistory = [mkBootStrapEvent(boardId, board)] as BoardHistoryEntry[]

    await client.query(`DELETE FROM board_event where board_id=$1`, [boardId])
    await storeEventHistoryBundle(boardId, bootstrappedHistory, client)
    await saveBoardSnapshot(board, client)

    console.log(`Bootstrapped history for board ${boardId}`)
}
