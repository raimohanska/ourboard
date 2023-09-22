docker run \
  -it \
  --init \
  -e SESSION_SIGNING_SECRET=NOTICE________THIS_________IS____NOT___SECURE_____USE_RANDOMIZED____STRING__INSTEAD \
  -e DATABASE_URL=postgres://r-board:secret@host.docker.internal:13338/r-board \
  --mount type=bind,source="$(pwd)"/backend/localfiles,target=/usr/src/app/backend/localfiles \
  -p 127.0.0.1:1337:1337/tcp \
  raimohanska/ourboard