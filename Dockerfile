FROM node:18

# Create app directory
WORKDIR /usr/src/app

COPY package.json yarn.lock ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

RUN yarn install --frozen-lockfile --non-interactive

COPY . .
run yarn build

EXPOSE 1337

CMD [ "node", "backend" ]