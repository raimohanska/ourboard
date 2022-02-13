require("dotenv").config()
import { findAllBoards } from "../board-store"
import { compactBoardHistory } from "../compact-history"
import { withDBClient } from "../db"

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
