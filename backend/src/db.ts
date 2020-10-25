import pg, { PoolClient } from "pg";
import process from "process";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://r-board:secret@localhost:13338/r-board"

const pgConfig = {
    connectionString: DATABASE_URL,
    ssl: process.env.DATABASE_URL ? {
        rejectUnauthorized: false
    } : undefined
}
const connectionPool = new pg.Pool(pgConfig)

export async function initDB() {
    await withDBClient(async client => {
        await client.query(`
            CREATE TABLE IF NOT EXISTS board (id text PRIMARY KEY, name text NOT NULL);
            ALTER TABLE board ADD COLUMN IF NOT EXISTS content JSONB NOT NULL;

            CREATE OR REPLACE FUNCTION notify_clean_boards() RETURNS trigger AS $$
            DECLARE
            BEGIN
              PERFORM pg_notify('clean_boards', TG_TABLE_NAME);
              RETURN new;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS clean_boards_trigger ON board;

            CREATE TRIGGER clean_boards_trigger AFTER TRUNCATE ON board
            FOR EACH STATEMENT EXECUTE FUNCTION notify_clean_boards();
        `);
    })

    return {
        onEvent: async (eventNames: string[], cb: ((n: pg.Notification) => any)) => {
            const client = await connectionPool.connect();
            eventNames.map(e => client.query(`LISTEN ${e}`))
            client.on("notification", cb)
        }
    }
}

export async function withDBClient<T>(f: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await connectionPool.connect()
    try {
        return f(client)
    } finally {
        client.release()
    }
}