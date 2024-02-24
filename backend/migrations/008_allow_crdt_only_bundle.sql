alter table board_event alter column first_serial drop not null;
alter table board_event add constraint first_serial_or_crdt check (crdt_update is not null OR first_serial is not null);