exports.up = (pgm) => {
    pgm.sql(`
    CREATE TABLE IF NOT EXISTS board (id text PRIMARY KEY, name text NOT NULL);
    ALTER TABLE board ADD COLUMN IF NOT EXISTS content JSONB NOT NULL;
    ALTER TABLE board ADD COLUMN IF NOT EXISTS history JSONB NOT NULL default '[]';            
    CREATE TABLE IF NOT EXISTS board_event (board_id text REFERENCES board(id), last_serial integer, events JSONB NOT NULL, PRIMARY KEY (board_id, last_serial));
    ALTER TABLE board_event ALTER COLUMN last_serial SET NOT NULL;
    ALTER TABLE board_event ALTER COLUMN board_id SET NOT NULL;
    CREATE TABLE IF NOT EXISTS board_api_token (board_id text REFERENCES board(id), token TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS app_user (id text PRIMARY KEY, email text NOT NULL);
    CREATE TABLE IF NOT EXISTS user_board (user_id text REFERENCES app_user(id), board_id text REFERENCES board(id), last_opened TIMESTAMP NOT NULL, PRIMARY KEY (user_id, board_id));
    ALTER TABLE board ADD COLUMN IF NOT EXISTS ws_host TEXT NULL;
    ALTER TABLE board ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NULL DEFAULT now();            
    ALTER TABLE board_event ADD COLUMN IF NOT EXISTS saved_at TIMESTAMP NULL DEFAULT now();
    `)
}
