An online whiteboard. Think of it as very poor man's Miro that's open source, free to use and which you can also host yourself. Feel free to try at https://www.ourboard.io/

In this Readme:

-   [User guide](#features-and-user-guide)
-   [API](#api)
-   [Development instructions](#development)
-   [Hosting Ourboard](#hosting)

## Features and User Guide

The user guide here is bound to be incomplete and out-of-date. Feel welcome to improve it!

### Basics

Setting your nickname or sign in

-   Click on the top right corner nickname field to change your nickname
-   Optionally, log in with your Google user account. This allows you to create private boards and to track your favorite boards across devices

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

Organizing your board

-   Create an Area and drag items on it to keep them together. When you move the Area, the items move with it!
-   Use Areas, lines, connections and images to give a visual structure to your board
-   Lock items in place to prevent accidental moves of static items and lines
-   Use "structured stickies": 1. Create an Area to be used as a template, choose a nice color 2. Add template content, e.g.. labels like "size" 3. Lock the labels in place. Now you can clone the whole area with a single click on the Clone button (or Cmd-D).

Copy and paste

-   You can cut/copy/paste contents on the board using keyboard shortcuts
-   Copy-paste works across boards, so you can do a "backup" by selecting all notes and pasting on another board
-   You should be able to paste text and images on the board from other applications as well
-   You can create a full clone of your current board by clicking on the Clone button beside board name

Keyboard shortcuts

These are for Mac. For other Linux/Windows, replace Command with Control.

```
DEL/Backspace       Delete item
A                   Create new area
N                   Create new note
T                   Create new text box
C                   Select the Connect tool
Esc                 Select the default tool
H                   Hide contents of an area
Command-A           Select all items
Command-V           Paste
Command-C           Copy
Command-X           Cut
Command-Z           Undo
Command-Shift-Z     Redo
Command-D           Duplicate
Command-Minus       Zoom out
Command-Plus        Zoom in
Command-Zero        Reset zoom
Arrow keys          Move selected items. SHIFT for big steps, ALT for fine-tuning.
```

Pro tips

-   You can drag the toolbar / palette around, if it gets in your way at the top-center position

### Board access controls

All boards created accessible to anyone with the link by default. If you Sign In using Google authentication, you'll also be able to create boards with restricted access. It's possible to grant access to certain emails or to people with an email in a given domain.

## API

Ourboard has a limited HTTP API for creating, exporting and updating boards.

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

Response:

```js
{
    "id": "ITEM_ID"
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

or

```js
{
    "x": "integer",
    "y": "integer",
    "type": "note",
    "text": "text on note",
    "color": "hexadecimal color code",
    "width": "integer",
    "height": "integer",
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

## Github Issues Integration

1. Create a board and an Area named "new issues" (case insensitive) on the board.
2. Add a webhook to a git repo, namely
    1. Use URL https://www.ourboard.io/api/v1/webhook/github/{board-id}, with board-id from the URL of you board.
    2. Use content type to application/json
    3. Select "Let me select individual events" and pick Issues only.
3. Create a new issue or change labels of an existing issue.
4. You should see new notes appear on your board

## Development

Running locally requires `docker-compose` which is used for starting the local PostgreSQL database. The script below starts the database, but you must make sure you have a working docker setup on your machine, of course.

Running locally:

```
yarn install
yarn dev
```

Run end-to end Playwright tests

-   `yarn test:playwright` to run tests once
-   `yarn test:playwright --ui` to open the Playwright UI

Connect to the local PostgreSQL database

    yarn psql

### Tech stack

-   TypeScript
-   [Harmaja](https://github.com/raimohanska/harmaja) frontend library
-   WebSockets (express-ws / uWebSockets.js both!)
-   Express server
-   Typera for HTTP API

### Developing with production data

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

### Building and pushing the raimohanska/ourboard docker image

```
docker login
docker build . -t raimohanska/ourboard:latest
docker push raimohanska/ourboard:latest
```

## Hosting

OurBoard is made to be easy to deploy and host. It consists of a single Node.js process that needs a PostgreSQL database for storing data. Using environment variables (see below) you can set the URL for the database and optionally configure OurBoard to use S3 for image assets and Google for authentication. By default it comes without authentication / authorization and stores image assets in the local file system.

### Heroku

If it suits you, Heroku is likely to be the easiest way to host your own OurBoard server. You should be able to host your own OurBoard instance pretty easily in Heroku. This repository should be runnable as-is,
provided you set up some environment variables, which are listed below.

### Docker

OurBoard is available as a Docker image so you can deploy it with Docker or your favorite container environment of choice. To get an OurBoard docker image, you can either:

1. Use the [raimohanska/ourboard image](https://hub.docker.com/r/raimohanska/ourboard) in Docker Hub (just skip to running, it will be downloaded automatically)
2. Build it from this repository: `docker build . -t raimohanska/ourboard:latest`

You can run it like this:

1. Start a posgres database. For example, running `docker-compose up` in your local clone of this directory will start one.
2. Start the Ourboard container. Run the example script `scripts/run_dockerized.sh` to try it out.

With the example script, you'll have a setup which

-   Doesn't have authentication. See environment variables below for configuring Google authentication, which is the only supported option for now.
-   Stores uploaded assets (images) on the local filesystem. The example script binds the local directory `backend/localfiles` to be used for storage. In your own script, you'll probably want to point out a more suitable directory on your server machine.
-   Uses an absolutely insecure SESSION_SIGNING_KEY. Make sure to use a long random string instead.
-   Uses plain HTTP and responds at http://localhost:1337. If you want it to respond at some other URL, you'll need to set the ROOT\__\_URL variable (and all the WS_ variables unless you have the latest ourboard image)

Read on!

### Environment variables

The OurBoard server is configured using environment variables. Here's a most likely incomplete list of supported environment variables for the server.

When developing the application locally, set these variables in `backend/.env` file. The most important first - you'll most likely need to set these.

```
DATABASE_URL          Postgres database URL. In Heroku, you can just add the PostgreSQL add on and this variable will be correctly set. The free one will get you started.
ROOT_URL              Root URL used for redirects. Use https://<yourdomain>/. If you don't have authentication configured or you're actually planning to access your server using the address http://localhost:1337, you can omit this one.
PORT                  HTTP port that OurBoard should bind. Defaults to 1337.
```

HTTPS and TLS related settings:

```
HTTPS_PORT            Local port to use for HTTPS sockets. Use this if you want OurBoard to terminate HTTPS. If you use a proxy like NGINX or run in a hosted environment like Heroku, you won't be needing this one.
HTTPS_CERT_FILE       Path to HTTPS certificate file. When running in docker, make sure to add appropriate mounts to make the file available to the dockerized process.
HTTPS_KEY_FILE        Path to HTTPS key file. When running in docker, make sure to add appropriate mounts to make the file available to the dockerized process.
REDIRECT_URL          Put your OurBoard application root URL here, if you want the server to redirect all requests that don't have the x-forwarded-proto=https
DATABASE_SSL_ENABLED  Use `true` to use SSL for database connection. Recommended.
```

AWS environment variables, needed for hosting board assets on AWS S3. If these are missing, all uploaded
assests (images, videos) will be stored in the local filesystem (using the path "localfiles"),
which is a viable solution only if you have a persistent file system with backups.

```
AWS_ACCESS_KEY_ID       AWS access key ID
AWS_SECRET_ACCESS_KEY   Secret access key
AWS_ASSETS_BUCKET_URL   URL to the AWS bucket. For example https://r-board-assets.s3.eu-north-1.amazonaws.com
```

The experimental collaborative editing feature is controlled using environment variables as well:

```
COLLABORATIVE_EDITING   `true` to enable for all new boards, `false` to disable for new boards, `opt-in` to allow opt-in on creation (default), `opt-in-authenticated` to allow opt-in for authenticated users only
```

And finally some more settings you're unlikely to need.

```
WS_HOST_DEFAULT       Your domain name here, used for routing websocket connections. Is automatically derived from ROOT_URL in latest image.
WS_HOST_LOCAL         Your domain name here as well. Is automatically derived from ROOT_URL in latest image.
WS_PROTOCOL           `wss` for secure, `ws` for non-secure WebSockets. Is automatically derived from ROOT_URL in latest image.
BOARD_ALIAS_tutorial  Board identifier for the "tutorial" board that will be cloned for new users. Allows you to create a custom tutorial board. For example, the value `782d4942-a438-44c9-ad5f-3187cc1d0a63` is used in ourboard.io, and this points to a publicly readable, but privately editable board
```

### Authentication configuration

Ourboard can be configured to use Google or generic OpenID Connect (OIDC) authentication using environment variables.

Even if you set an auth provider (see below), the server will default to allowing anonymous access as well - only boards that are explicitly set with access restrictions will require authentication. However, if you want to require authentication for all access, you can use the following environment variable.

```
REQUIRE_AUTH        Use `true` to require authentication for all access.
```

#### Google authentication

Google authentication is supported. To enable this feature, you'll need to supply the following environment variables.

```
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
```

You'll of course need to set up an account on the Google side and configure a client so that you can get the client id and secret variables you'll use on OurBoard side. When configuring the Google client, you should allow the URL `<OURBOARD_ROOT_URL>/google-callback` as a valid callback URL.

#### OpenID Connect configuration

Generic OpenID Connect (OIDC) authentication is also supported as an experimental feature. To enable this feature, you'll need to supply the following environment variables.

```
OIDC_CONFIG_URL        Your OpenID configuration endpoint. For example: https://accounts.google.com/.well-known/openid-configuration
OIDC_CLIENT_ID         Your OAuth2 client id
OIDC_CLIENT_SECRET     Your OAuth2 client secret
OIDC_LOGOUT            URL to redirect the user after a logout on Ourboard. This allows you to sign out from the OIDC provider. You can also use the value `true` to automatically determine this URL based on the `end_session_endpoint` field in the response from the OIDC_CONFIG_URL endpoint. If omitted and `REQUIRE_AUTH=true` is not set, OurBoard will simply allow anonymous usage after a logout.
```

You'll of course need an external auth provider and configure a client so that you can get the client id and secret variables you'll use on OurBoard side. When configuring the OIDC client, you should allow the URL `<OURBOARD_ROOT_URL>/google-callback` as a valid callback URL. OurBoard uses the OAuth "standard flow" or "authorization code flow" and expects to be able to find your OIDC configuration at the URL pointed by tge `OIDC_CONFIG_URL` environment variable.

In the Id Token received from the Auth provider, OurBoard expects to find the following claims:

-   Either `name` or `preferred_username` representing the display name for the user
-   `email` representing the email address of the user. OurBoard does not expect this to be a valid email address; it just uses the email as the unique identifier for the user.
-   Optional `picture` for a URL for the user's profile picture

Thus far, I've tested Ourboard OIDC with Google and Keycloak.

#### OpenID Connect Using KeyCloak

NOTICE: This is just a simple example for testing and **not a production-grade setup**. Make sure to configure Keycloak properly before using it in production.

An example KeyCloak setup is bundled with the OurBoard development environment. To try it, set the following environment variables in `backend/.env`:

```
OICD_CONFIG_URL=http://127.0.0.1:8080/realms/ourboard/.well-known/openid-configuration
OIDC_CLIENT_ID=ourboard
OIDC_CLIENT_SECRET=S2qHjCg12IDxz89Lffo49NQ19ooWCUwF
```

When you start OurBoard in development mode using `yarn dev-with-keycloak`, you can now Sign In using the username `ourboard-test` and password `password`.

## Contribution

See Issues!

## A word from our sponsor

I want to thank [Reaktor](https://www.reaktor.com/) for the huge and essential support for this project!

-   We (Reaktorian contributors) get some monetary support from the Reaktor open-source support program
-   Hosting costs covered by Reaktor (Heroku, AWS)
-   The UI design was done by Reaktor's experts (Mira Myllylä for the tool and Mari Halla-aho for the dashboard)
