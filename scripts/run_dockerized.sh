docker run \
  -it \
  -e SESSION_SIGNING_SECRET=not-really-secret-you-should-use-a-randomized-one \
  -e DATABASE_URL=postgres://r-board:secret@host.docker.internal:13338/r-board \
  --mount type=bind,source="$(pwd)"/backend/localfiles,target=/usr/src/app/backend/localfiles \
  -p 127.0.0.1:1337:1337/tcp \
  ourboard