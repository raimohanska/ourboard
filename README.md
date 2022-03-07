An online whiteboard.

Feel free to try at https://www.ourboard.io/

## Features and User Guide

### Basics

Setting your nickname

-   Click on the top right corner nickname field to change

Adding items

-   Drag from palette
-   Double click to add a new note
-   Use keyboard shortcuts below

Adding links

-   Paste a link to text, it'll automatically converted to a hyperlink
-   Select text and paste a link to convert the text to a link

Adding images

-   Add by dragging a file from your computer or from a browser window
-   Add by pasting an image from the clipboard using Command-V

Adding videos

-   Add by dragging a file from your computer or from a browser window

Keyboard shortcuts

```
DEL/Backspace       Delete item
A                   Create new area
N                   Create new note
T                   Create new text box
C                   Select the Connect tool
Esc                 Select the default tool
Command-V           Paste
Command-C           Copy
Command-X           Cut
Command-Z           Undo
Command-Shift-Z     Redo
Command-D           Duplicate
Arrow keys          Move selected items. SHIFT for big steps, ALT for fine-tuning.
```

Pro tips

-   You can drag the toolbar / palette around, if it gets in your way at the top-center position

### Board access controls

All boards created using the UI are accessible to anyone with the link.

Boards with restricted access can currently only be created using the POST API (see below).

## Github Issues Integration

1. Create a board and an Area named "new issues" (case insensitive) on the board.
2. Add a webhook to a git repo, namely
    1. Use URL https://www.ourboard.io/api/v1/webhook/github/{board-id}, with board-id from the URL of you board.
    2. Use content type to application/json
    3. Select "Let me select individual events" and pick Issues only.
3. Create a new issue or change labels of an existing issue.
4. You should see new notes appear on your board

## API

For a full list of API endpoints, see https://ourboard.io/api-docs.

All POST and PUT endpoints accept application/json content.

API requests against boards with restricted access require you to supply an API_TOKEN header with a valid API token.
The token is returned in the response of the POST request used to create the board.

### POST /api/v1/board

Creates a new board. Payload:

```js
{
    "name": "board name as string",
}
```

You can also specify board access policy, including individual users by email and user email domains:

```js
{
    "name": "board name as string",
    "accessPolicy": {
        "allowList": [
            { email: "coolgirl@reaktor.com" },
            { domain: "reaktor.fi" }
        ]
    }
}
```

Response:

```js
{
    "id": "board id",
    "accessToken": "************"
}
```

The `accessToken` returned here is required for further API calls in case you set an access policy. So, make sure to save the token.

### PUT /api/v1/board/:boardId

Changes board name and, optionally, access policy. Payload is similar to the POST request above.

This endpoint always requires the API_TOKEN header.

### POST /api/v1/board/:boardId/item

Creates a new item on given board. If you want to add the item onto a specific area/container element on the board, you can
find the id of the container by inspecting with your browser.

Payload:

```js
{
    "type": "note",
    "text": "text on note",
    "container": "container element text or id",
    "color": "hexadecimal color code"
}
```

### PUT /api/v1/board/:boardId/item/:itemId

Creates a new item on given board or updates an existing one.
If you want to add the item onto a specific area/container element on the board, you can
find the id of the container by inspecting with your browser.

Payload:

```js
{
    "type": "note",
    "text": "text on note",
    "container": "container element text or id",
    "color": "hexadecimal color code",
    "replaceTextIfExists": boolean,      // Override text if item with this id exists. Defaults to false.
    "replaceColorIfExists": boolean,     // Override color if item with this id exists. Defaults to false.
    "replaceContainerIfExists": boolean, // Override container in item with this id exists. Defaults to true.
}
```

### GET /api/v1/board/:boardId

Return board current state as JSON.

### GET /api/v1/board/:boardId/hierarchy

Return board current state in a hierarchical format (items inside containers)

### GET /api/v1/board/:boardId/csv

Return board current state in CSV format, where

-   A container containing only leaf items (note, text) creates a row and each item in that container gets its own column
-   Container name is a column on the left
-   Any wrapping containers also add a column on the left

### GET /api/v1/board/:boardId/history

Returns the full history of given board as JSON.

## Google Authentication integration

Google authentication is supported. To enable this feature, you'll need to supply `GOOGLE_API_KEY` and `GOOGLE_CLIENT_ID` as environment variables. When running locally, you'll need to place these variables in both `frontend/.env` and `backend/.env`.

## Tech stack

-   TypeScript
-   [Harmaja](https://github.com/raimohanska/harmaja) frontend library
-   WebSockets (express-ws / uWebSockets.js both!)
-   Express server
-   Typera for HTTP API
-   Heroku

## Dev

Running locally requires `docker-compose` which is used for starting the local PostgreSQL database. The script below starts the database, but you must make sure you have a working docker setup on your machine, of course.

Running locally:

```
yarn install
yarn dev
```

Run end-to end Cypress tests against the server you just started:

-   `yarn test-e2e:dev` to run once
-   `yarn cypress` to open the Cypress UI for repeated test runs

Connect to the local PostgreSQL database

    yarn psql

## Developing with production data

Do not run your local server against the production database, or you'll corrupt production. The server's in memory state will be out of sync with DB and bad things will happen.

Instead, do this.

1. Capture a backup and download it: `heroku pg:backups:capture`, then `heroku pg:backups:download`.
2. Restore the backup to your local database: `pg_restore --verbose --clean --no-acl --no-owner -d postgres://r-board:secret@localhost:13338/r-board latest.dump`
3. Start you local server using `yarn dev`

If you need the local state for a given board in localStorage, you can

1. extract the content in the browser devtools, when viewing production site in browser, using `localStorage["board_<boardid>"]`
2. Copy that string to clipboard
3. Run the following in your localhost site console:

    localStorage["board_32de1a50-09a6-4453-9b9e-ed10c56afa99"]=JSON.stringify(
    <paste content here>
    )

Copy the result string, navigate to your localhost site and paste the same value to the same localStorage key. Refresh and enjoy.

## Hosting

### Heroku

You should be able to host your own OurBoard instance pretty easily in Heroku. This repository should be runnable as-is,
provided you set up some environment variables, which are listed below.

### Other options

No other options beside Heroku are available out-of-the-box, but the application is rather simple. Running `yarn build` will build it and `yarn run` will run it. When building for production, some of the environment variables need to be present (see `esbuild.js`) though, so that the client can use Google Login.

### Environment variables

```
DATABASE_URL          Postgres database URL. In Heroku, you can just add the PostgreSQL add on and this variable will be correctly set. The free one will get you started.
DATABASE_SSL_ENABLED  Use `true` to use SSL for database connection. Recommended.
REDIRECT_URL          Put your OurBoard application root URL here, if you want the server to redirect all requests that don't have the x-forwarded-proto=https header. For example: https://www.ourboard.io/.
WS_HOST_DEFAULT       Your domain name here, used for routing websocket connections
WS_HOST_LOCAL         Your domain name here as well
WS_PROTOCOL           `wss` for secure, `ws` for non-secure WebSockets. Always use wss.
BOARD_ALIAS_tutorial  Board identifier for the "tutorial" board that will be cloned for new users. Allows you to create a custom tutorial board. For example, the value `782d4942-a438-44c9-ad5f-3187cc1d0a63` is used in ourboard.io, and this points to a publicly readable, but privately editable board
```

AWS environment variables, needed for hosting board assets on AWS S3. If these are missing, all uploaded
assests (images, videos) will be stored in the local filesystem, which is a viable solution only if you have
a persistent file system with backups.

```
AWS_ACCESS_KEY_ID       AWS access key ID
AWS_SECRET_ACCESS_KEY   Secret access key
AWS_ASSETS_BUCKET_URL   URL to the AWS bucket. For example https://r-board-assets.s3.eu-north-1.amazonaws.com
```

Google Authentication environment variables, needed if you want to enable Google auth. Currently there are no
other authentication alternatives, so it's either Google or anonymous access.

```
GOOGLE_API_KEY
GOOGLE_CLIENT_ID
```

## Contribution

See Issues!

## A word from our sponsor

I want to thank [Reaktor](https://www.reaktor.com/) for the huge and essential support for this project!

-   We (Reaktorian contributors) get some monetary support from the Reaktor open-source support program
-   Hosting costs covered by Reaktor (Heroku, AWS)
-   The UI design was done by Reaktor's experts (Mira Myllylä for the tool and Mari Halla-aho for the dashboard)
