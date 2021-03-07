import { inTransaction, withDBClient } from "./db"
import * as uuid from "uuid"
import { EventUserInfo, Id, RecentBoard, EventUserInfoAuthenticated, ISOTimeStamp } from "../../common/src/domain"
import { uniqBy } from "lodash"

export function getUserIdForEmail(email: string): Promise<string> {
    return inTransaction(async (client) => {
        let id: string | undefined = (await client.query("SELECT id FROM app_user WHERE email=$1", [email])).rows[0]?.id
        if (!id) {
            id = uuid.v4()
            await client.query("INSERT INTO app_user (id, email) VALUES ($1, $2);", [id, email])
        }
        return id
    })
}

export async function associateUserWithBoard(
    userId: string,
    boardId: Id,
    lastOpened: ISOTimeStamp = new Date().toISOString(),
) {
    try {
        await inTransaction(async (client) => {
            await client.query(
                `INSERT INTO user_board (user_id, board_id, last_opened) values ($1, $2, $3) 
                 ON CONFLICT (user_id, board_id) DO UPDATE SET last_opened=EXCLUDED.last_opened`,
                [userId, boardId, lastOpened],
            )
        })
    } catch (e) {
        console.error(`Failed to associate user ${userId} with board ${boardId}`)
    }
}

export async function dissociateUserWithBoard(userId: string, boardId: Id) {
    try {
        await inTransaction(async (client) => {
            await client.query(`DELETE FROM user_board WHERE user_id=$1 and board_id=$2`, [userId, boardId])
        })
    } catch (e) {
        console.error(`Failed to dissociate user ${userId} with board ${boardId}`)
    }
}

export async function getUserAssociatedBoards(user: EventUserInfoAuthenticated): Promise<RecentBoard[]> {
    const rows = (
        await withDBClient((client) =>
            client.query(
                "SELECT b.id, b.name, ub.last_opened FROM user_board ub JOIN board b on (ub.board_id = b.id) WHERE ub.user_id = $1",
                [user.userId],
            ),
        )
    ).rows
    return rows.map((r) => {
        return {
            id: r.id,
            name: r.name,
            userEmail: user.email,
            opened: r.last_opened.toISOString(),
        }
    })
}
