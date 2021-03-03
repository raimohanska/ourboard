import { withDBClient } from "../db"
import { compactBoardHistory } from "../compact-history"
import { findAllBoards } from "../board-store"

async function doIt() {
    const ids = await withDBClient(findAllBoards)
    for (let id of ids) {
        await compactBoardHistory(id)
    }
}

doIt()
