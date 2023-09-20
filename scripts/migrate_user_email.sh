#!/bin/bash

from_email=$1
to_email=$2

if [ -z $to_email ]; then
  echo "Usage: migrate_user_email.sh <fromemail> <toemail>"
  exit 1
fi

if [ -z $DATABASE_URL ]; then
  echo "DATABASE_URL env missing"
  exit 1
fi

echo Migrating user email from $from_email to $to_email

cat << EOF | psql $DATABASE_URL
BEGIN;
insert into app_user(id, email) 
	values (uuid_generate_v4(), '$to_email')
	on conflict do nothing;

update board_access set email='$to_email' where email='$from_email';

insert into user_board(board_id, user_id, last_opened) (
  select board_id, (select id from app_user where email='$to_email'), last_opened
  from user_board where user_id = (select id from app_user where email='$from_email')
) on conflict do nothing;

COMMIT;

EOF
