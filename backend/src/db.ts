import pg, { PoolClient } from "pg"
import process from "process"

const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://r-board:secret@localhost:13338/r-board"

const pgConfig = {
    connectionString: DATABASE_URL,
    ssl: process.env.DATABASE_URL
        ? {
              rejectUnauthorized: false,
          }
        : undefined,
}
const connectionPool = new pg.Pool(pgConfig)

export async function initDB() {
    await inTransaction(async (client) => {
        await client.query(`
            CREATE TABLE IF NOT EXISTS board (id text PRIMARY KEY, name text NOT NULL);
            ALTER TABLE board ADD COLUMN IF NOT EXISTS content JSONB NOT NULL;
            ALTER TABLE board ADD COLUMN IF NOT EXISTS history JSONB NOT NULL default '[]';            
            CREATE TABLE IF NOT EXISTS board_event (board_id text REFERENCES board(id), last_serial integer, events JSONB NOT NULL, PRIMARY KEY (board_id, last_serial));
            ALTER TABLE board_event ALTER COLUMN last_serial SET NOT NULL;
            ALTER TABLE board_event ALTER COLUMN board_id SET NOT NULL;
        `)
    })

    return {
        onEvent: async (eventNames: string[], cb: (n: pg.Notification) => any) => {
            const client = await connectionPool.connect()
            eventNames.map((e) => client.query(`LISTEN ${e}`))
            client.on("notification", cb)
        },
    }
}

export async function withDBClient<T>(f: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await connectionPool.connect()
    try {
        await client.query('BEGIN;SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;');
        return f(client)
    } finally {
        await client.query("ROLLBACK;");
        client.release()
    }
}

export async function inTransaction<T>(f: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await connectionPool.connect()
    try {
        await client.query(`
            BEGIN;
            SET SESSION CHARACTERISTICS AS TRANSACTION READ WRITE;
        `);
        const result = await f(client)
        await client.query("COMMIT;");
        return result
    } catch (e) {
        await client.query("ROLLBACK;");
        throw e
    } finally {
        client.release()
    }
}
