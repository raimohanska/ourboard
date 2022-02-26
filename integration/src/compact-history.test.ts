import { addHours, addSeconds } from "date-fns"
import _ from "lodash"
import { createBoard, getBoardHistoryBundleMetas, storeEventHistoryBundle } from "../../backend/src/board-store"
import { quickCompactBoardHistory } from "../../backend/src/compact-history"
import { closeConnectionPool, initDB, inTransaction, withDBClient } from "../../backend/src/db"
import { BoardHistoryEntry, EventUserInfo, Id, newBoard, Serial } from "../../common/src/domain"
type BundleDesc = [Date, Serial, Serial]
describe("quick compact", () => {
    beforeAll(() => initDB("./backend"))
    it("Compacts nearby events into single bundle", async () => {
        const board = newBoard("testboard")
        const boardId = board.id
        await createBoard(board)
        const firstSave = new Date()
        const secondSave = addSeconds(firstSave, 1)
        const origBundles: BundleDesc[] = [
            [firstSave, 1, 2],
            [secondSave, 3, 4],
        ]
        await storeBundles(boardId, origBundles)
        expect(await getBundles(boardId)).toEqual(origBundles)
        const compactions = await quickCompactBoardHistory(boardId)
        expect(compactions).toEqual(1)
        expect(await getBundles(boardId)).toEqual([[secondSave, 1, 4]])
    })

    it("Skips compaction in case bundles are separate from each other in time", async () => {
        const board = newBoard("testboard")
        const boardId = board.id
        await createBoard(board)
        const firstSave = new Date()
        const secondSave = addHours(firstSave, 1)
        const origBundles: BundleDesc[] = [
            [firstSave, 1, 2],
            [secondSave, 3, 4],
        ]
        await storeBundles(boardId, origBundles)
        expect(await getBundles(boardId)).toEqual(origBundles)
        const compactions = await quickCompactBoardHistory(boardId)
        expect(compactions).toEqual(0)
        expect(await getBundles(boardId)).toEqual(origBundles)
    })

    it("Groups by hour-of-day when one group needs compaction", async () => {
        const board = newBoard("testboard")
        const boardId = board.id
        await createBoard(board)
        const firstSave = new Date()
        const secondSave = addHours(firstSave, 1)
        const origBundles: BundleDesc[] = [
            [firstSave, 1, 2],
            [secondSave, 3, 4],
            [secondSave, 5, 6],
        ]
        await storeBundles(boardId, origBundles)
        expect(await getBundles(boardId)).toEqual(origBundles)
        const compactions = await quickCompactBoardHistory(boardId)
        expect(compactions).toEqual(1)
        expect(await getBundles(boardId)).toEqual([
            [firstSave, 1, 2],
            [secondSave, 3, 6],
        ])
    })

    it("Groups by hour-of-day when two groups need compaction", async () => {
        const board = newBoard("testboard")
        const boardId = board.id
        await createBoard(board)
        const firstSave = new Date()
        const earlierSave = addHours(firstSave, -1)
        const secondSave = addHours(firstSave, 1)
        const laterSave = addHours(secondSave, 1)
        const origBundles: BundleDesc[] = [
            [earlierSave, 1, 1],
            [firstSave, 2, 2],
            [firstSave, 3, 3],
            [secondSave, 4, 5],
            [secondSave, 6, 7],
            [laterSave, 8, 8],
        ]
        await storeBundles(boardId, origBundles)
        expect(await getBundles(boardId)).toEqual(origBundles)
        const compactions = await quickCompactBoardHistory(boardId)
        expect(compactions).toEqual(2)

        expect(await getBundles(boardId)).toEqual([
            [earlierSave, 1, 1],
            [firstSave, 2, 3],
            [secondSave, 4, 7],
            [laterSave, 8, 8],
        ])
    })

    afterAll(closeConnectionPool)
})

async function storeBundles(boardId: Id, bundles: BundleDesc[]) {
    for (let [savedAt, firstSerial, lastSerial] of bundles) {
        await addItems(boardId, firstSerial, lastSerial, savedAt)
    }
}

async function getBundles(boardId: Id) {
    const bundles = await withDBClient((client) => getBoardHistoryBundleMetas(client, boardId))
    return bundles.map((b) => [b.saved_at, b.first_serial, b.last_serial])
}

const user: EventUserInfo = { userType: "unidentified", nickname: "user1" }
async function addItems(boardId: Id, firstSerial: Serial, lastSerial: Serial, savedAt: Date) {
    const events: BoardHistoryEntry[] = _.range(firstSerial, lastSerial + 1).map((serial) => ({
        action: "item.add",
        boardId,
        items: [],
        connections: [],
        timestamp: new Date().toISOString(),
        user,
        serial,
    }))
    await inTransaction((client) => storeEventHistoryBundle(boardId, events, client, savedAt))
}
