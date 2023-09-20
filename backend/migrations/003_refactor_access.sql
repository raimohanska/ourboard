alter table board add public_read boolean null;
alter table board add public_write boolean null;
create table board_access (
  board_id text not null references board(id),
  domain text null,
  email text null,
  access text null
);

with allow_json as (
select id, jsonb_array_elements(content -> 'accessPolicy' -> 'allowList') as e
from board),

allow_entry as (
	select id, e ->> 'domain' as domain, e ->> 'email' as email, e ->> 'access' as access
	from allow_json
)

insert into board_access(board_id, domain, email, access) (
  select ae.id as board_id, ae.domain, ae.email, ae.access
  from allow_entry ae
);

update board
set public_read = coalesce(content -> 'accessPolicy' ->> 'publicRead', 'false') :: boolean,
    public_write = coalesce(content -> 'accessPolicy' ->> 'publicWrite', 'false') :: boolean
where content -> 'accessPolicy' is not null