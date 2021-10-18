import { format } from "date-fns"
import _, { last } from "lodash"
import { PoolClient } from "pg"
import { boardReducer } from "../../common/src/board-reducer"
import { Board, BoardHistoryEntry, Id } from "../../common/src/domain"
import { migrateBoard, mkBootStrapEvent } from "../../common/src/migration"
import {
    getBoardHistoryBundleMetas,
    getBoardHistoryBundles,
    getBoardHistoryBundlesWithLastSerialsBetween,
    mkSnapshot,
    saveBoardSnapshot,
    storeEventHistoryBundle,
    verifyContinuity,
    verifyContinuityFromMetas,
} from "./board-store"
import { inTransaction } from "./db"

export async function quickCompactBoardHistory(id: Id) {
    let fallback = false
    const result = inTransaction(async (client) => {
        const bundleMetas = await getBoardHistoryBundleMetas(client, id)
        if (bundleMetas.length === 0) return
        const consistent = verifyContinuityFromMetas(id, 0, bundleMetas)
        if (consistent) {
            // Group in one-hour bundles
            const groupedByHour = _.groupBy(bundleMetas, (b) => format(new Date(b.saved_at), "yyyy-MM-dd hh"))
            //console.log("Grouped by date", groupedByHour)
            const toCompact = Object.values(groupedByHour).filter((bs) => bs.length > 1)
            let compactions = 0
            for (let bs of toCompact) {
                const firstBundle = bs[0]
                const lastBundle = bs[bs.length - 1]
                console.log(
                    `Compacting ${bs.length} bundles into one for board ${id}, containing serials ${firstBundle.first_serial}...${lastBundle.last_serial}`,
                )
                const bundlesWithData = await getBoardHistoryBundlesWithLastSerialsBetween(
                    client,
                    id,
                    firstBundle.last_serial,
                    lastBundle.last_serial,
                )
                const eventArrays = bundlesWithData.map((b) => b.events.events)
                const consistent = verifyContinuity(id, firstBundle.first_serial - 1, ...eventArrays)
                const events: BoardHistoryEntry[] = eventArrays.flat()
                if (consistent && bundlesWithData.length == bs.length) {
                    // 1. delete existing bundles
                    const deleteResult = await client.query(
                        `DELETE FROM board_event where board_id=$1 and last_serial in (${bundlesWithData
                            .map((b) => b.last_serial)
                            .join(",")})`,
                        [id],
                    )
                    if (deleteResult.rowCount != bs.length) {
                        throw Error(
                            `Unexpected rowcount when deleting on compaction: ${deleteResult.rowCount} for board ${id}`,
                        )
                    }
                    // 2. store as a single bundle
                    await storeEventHistoryBundle(id, events, client, lastBundle.saved_at)
                } else {
                    fallback = true
                    return
                }
                compactions++
            }
            if (compactions > 0) {
            } else {
                console.log(
                    `Board ${id}: Verified ${bundleMetas.length} bundles containing ${
                        bundleMetas[bundleMetas.length - 1].last_serial
                    } events => no need to compact`,
                )
            }
            return compactions
        } else {
            fallback = true
        }
    })
    if (fallback) {
        console.warn(
            `Aborting quick compaction of board ${id} due to inconsistent history, fallback to regular compaction`,
        )
        await compactBoardHistory(id)
    } else {
        return result
    }
}

// TODO: get rid of the legacy compactor altogether after more experience with the quick one.
// It's role is currently work as a fallback in case the quick one fails. It's very unlikely though
// that it can fix any problems for real. The actual need is more like rebooting the whole history in case
// it's not consistent. And that would be the bootstrapHistory thing.
export function compactBoardHistory(id: Id) {
    return inTransaction(async (client) => {
        const bundles = await getBoardHistoryBundles(client, id)
        const eventArrays = bundles.map((b) => b.events.events)
        const consistent = verifyContinuity(id, 0, ...eventArrays)
        const events: BoardHistoryEntry[] = eventArrays.flat()
        if (consistent) {
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
            const result = await client.query("SELECT content FROM board WHERE id=$1", [id])
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
