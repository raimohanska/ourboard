FROM node:26-bookworm AS builder

RUN curl -fsSL https://repo.yarnpkg.com/install | bash
ENV PATH="/root/.yarn/switch/bin:$PATH"

# Create app directory
WORKDIR /usr/src/app

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/patches ./.yarn/patches
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
COPY perf-tester/package.json ./perf-tester/

RUN yarn switch trust --set true "$PWD" && yarn install --immutable

COPY backend ./backend
COPY frontend ./frontend
COPY common ./common
COPY perf-tester ./perf-tester
COPY tsconfig.json .

RUN yarn build

FROM node:26-bookworm AS runner

COPY --from=builder /usr/src/app/backend/dist/index.js /usr/src/app/backend/dist/index.js
COPY --from=builder /usr/src/app/backend/migrations /usr/src/app/backend/migrations
COPY --from=builder /usr/src/app/frontend/public /usr/src/app/frontend/public
COPY --from=builder /usr/src/app/frontend/dist /usr/src/app/frontend/dist
WORKDIR /usr/src/app
EXPOSE 1337

WORKDIR /usr/src/app/backend
CMD [ "node", "dist/index.js" ]
