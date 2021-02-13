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
    await withDBClient(async (client) => {
        await client.query(`
            CREATE TABLE IF NOT EXISTS board (id text PRIMARY KEY, name text NOT NULL);
            ALTER TABLE board ADD COLUMN IF NOT EXISTS content JSONB NOT NULL;
            ALTER TABLE board ADD COLUMN IF NOT EXISTS history JSONB NOT NULL default '[]';            
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
        return f(client)
    } finally {
        client.release()
    }
}
