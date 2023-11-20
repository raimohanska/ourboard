FROM node:18 as builder

# Create app directory
WORKDIR /usr/src/app

COPY package.json yarn.lock ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
COPY perf-tester/package.json ./perf-tester/

RUN yarn install --frozen-lockfile --non-interactive

COPY backend ./backend
COPY frontend ./frontend
COPY common ./common
COPY perf-tester ./perf-tester
COPY tsconfig.json .

run yarn build

FROM gcr.io/distroless/nodejs18-debian12 as runner

COPY --from=builder /usr/src/app/backend/dist/index.js /usr/src/app/backend/dist/index.js
COPY --from=builder /usr/src/app/backend/migrations /usr/src/app/backend/migrations
COPY --from=builder /usr/src/app/frontend/public /usr/src/app/frontend/public
COPY --from=builder /usr/src/app/frontend/dist /usr/src/app/frontend/dist
WORKDIR /usr/src/app
EXPOSE 1337

WORKDIR /usr/src/app/backend
CMD [ "dist/index.js" ]