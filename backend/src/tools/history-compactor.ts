require("dotenv").config()
import { withDBClient } from "../db"
import { compactBoardHistory } from "../compact-history"
import { findAllBoards } from "../board-store"
import { getEnv } from "../env"

const BOARD_ID = process.env.BOARD_ID || null

async function doIt() {
    if (BOARD_ID) {
        await compactBoardHistory(BOARD_ID)
    } else {
        const ids = await withDBClient(findAllBoards)
        for (let id of ids) {
            await compactBoardHistory(id)
        }
    }
}

doIt()
