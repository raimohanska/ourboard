import pg, { PoolClient } from "pg"
import process from "process"
import migrate from "node-pg-migrate"

const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://r-board:secret@localhost:13338/r-board"
const DATABASE_SSL_ENABLED = process.env.DATABASE_SSL_ENABLED === "true"

const pgConfig = {
    connectionString: DATABASE_URL,
    ssl: DATABASE_SSL_ENABLED
        ? {
              rejectUnauthorized: false,
          }
        : undefined,
}
const connectionPool = new pg.Pool(pgConfig)

export function closeConnectionPool() {
    connectionPool.end()
}

export async function initDB(backendDir: string = ".") {
    console.log("Running database migrations")
    await inTransaction((client) =>
        migrate({
            count: 100000,
            databaseUrl: DATABASE_URL,
            migrationsTable: "pgmigrations",
            dir: `${backendDir}/migrations`,
            direction: "up",
            dbClient: client,
        }),
    )
    console.log("Completed database migrations")

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
        await client.query("BEGIN;SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;")
        return await f(client)
    } finally {
        await client.query("ROLLBACK;")
        client.release()
    }
}

export async function inTransaction<T>(f: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await connectionPool.connect()
    try {
        await client.query(`
            BEGIN;
            SET SESSION CHARACTERISTICS AS TRANSACTION READ WRITE;
        `)
        const result = await f(client)
        await client.query("COMMIT;")
        return result
    } catch (e) {
        await client.query("ROLLBACK;")
        throw e
    } finally {
        client.release()
    }
}
