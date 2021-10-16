exports.up = (pgm) => {
    pgm.sql(`
    ALTER TABLE board_event ADD COLUMN IF NOT EXISTS first_serial int;
    UPDATE board_event SET first_serial = CAST(events#>'{events, 0, serial}' as int);
    ALTER TABLE board_event ALTER COLUMN first_serial SET NOT NULL;
    `)
}
