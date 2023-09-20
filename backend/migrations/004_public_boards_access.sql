update board
set public_read = 't',
    public_write = 't'
where content -> 'accessPolicy' is null