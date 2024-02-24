ALTER TABLE board_event DROP CONSTRAINT board_event_pkey;
CREATE INDEX board_event_board_index ON board_event (board_id);