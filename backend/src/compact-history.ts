import { format } from "date-fns"
import _ from "lodash"
import { BoardHistoryEntry, Id } from "../../common/src/domain"
import {
    BoardHistoryBundleMeta,
    getBoardHistoryBundleMetas,
    getBoardHistoryBundlesWithLastSerialsBetween,
    storeEventHistoryBundle,
    verifyContinuity,
    verifyContinuityFromMetas,
    verifyEventArrayContinuity,
} from "./board-store"
import * as Y from "yjs"
import { inTransaction } from "./db"

function chunkBy<T>(arr: T[], shouldSplit: (a: T, b: T) => boolean) {
    const result = []
    let currentChunk = []
    for (let i = 0; i < arr.length; i++) {
        if (i > 0 && shouldSplit(arr[i - 1], arr[i])) {
            result.push(currentChunk)
            currentChunk = []
        }
        currentChunk.push(arr[i])
    }
    result.push(currentChunk)
    return result
}
function getHour(b: BoardHistoryBundleMeta) {
    return format(new Date(b.saved_at), "yyyy-MM-dd hh")
}

export async function quickCompactBoardHistory(id: Id): Promise<number> {
    try {
        return await inTransaction(async (client) => {
            // Lock the board to prevent loading the board while compacting
            await client.query("select 1 from board where id=$1 for update", [id])
            const bundleMetas = await getBoardHistoryBundleMetas(client, id)
            if (bundleMetas.length === 0) return 0
            const consistent = verifyContinuityFromMetas(id, 0, bundleMetas)
            if (consistent) {
                // Group in one-hour bundles
                //console.log("Grouped by date", groupedByHour)
                const toCompact = chunkBy(
                    bundleMetas,
                    (a, b) => getHour(a) !== getHour(b) && a.last_serial !== b.last_serial,
                ).filter((chunk) => chunk.length > 1)
                let compactions = 0
                for (let bs of toCompact) {
                    const firstBundle = bs[0]
                    const lastBundle = bs[bs.length - 1]
                    console.log(
                        `Compacting ${bs.length} bundles into one for board ${id}, containing serials ${firstBundle.first_serial}...${lastBundle.last_serial}`,
                    )
                    const lastSerial = lastBundle.last_serial
                    const bundlesWithData = await getBoardHistoryBundlesWithLastSerialsBetween(
                        client,
                        id,
                        firstBundle.last_serial,
                        lastSerial,
                    )
                    for (const b of bundlesWithData) {
                        console.log(b.events.events[0]?.serial, b.events.events[b.events.events.length - 1]?.serial)
                    }
                    const eventArrays = bundlesWithData.map((b) => b.events.events)
                    const events: BoardHistoryEntry[] = eventArrays.flat()
                    const crdtUpdates = bundlesWithData.flatMap((d) => (d.crdt_update ? [d.crdt_update] : []))
                    const combinedCrdtUpdate = crdtUpdates.length ? Y.mergeUpdates(crdtUpdates) : null
                    const initSerial = firstBundle.first_serial
                        ? firstBundle.first_serial - 1
                        : firstBundle.last_serial - 1
                    const consistent =
                        verifyContinuity(id, initSerial, ...eventArrays) &&
                        verifyEventArrayContinuity(id, initSerial, events)
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
                        await storeEventHistoryBundle(
                            id,
                            events,
                            lastSerial,
                            combinedCrdtUpdate,
                            client,
                            lastBundle.saved_at,
                        )
                    } else {
                        throw Error("Discontinuity detected in compacted history.")
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
                throw Error("Discontinuity detected in bundle metadata.")
            }
        })
    } catch (e) {
        console.error(`Aborting compaction of board ${id} because of an error: ${e}`)
        return 0
    }
}
