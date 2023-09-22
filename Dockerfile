FROM node:18

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

EXPOSE 1337

WORKDIR /usr/src/app/backend
CMD [ "node", "." ]