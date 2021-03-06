An online whiteboard.

Feel free to try at https://r-board.herokuapp.com/

## Features and User Guide

### Basics

Setting your nickname

-   Click on the top right corner nickname field to change

Adding items

-   Drag from palette
-   Double click to add a new note
-   Use keyboard shortcuts below

Adding images

-   Add by dragging a file from your computer or from a browser window
-   Add by pasting an image from the clipboard using Command-V

Keyboard shortcuts

```
DEL/Backspace       Delete item
A                   Create new area
N                   Create new note
T                   Create new text box
Command-V           Paste
Command-C           Copy
Command-X           Cut
Command-Z           Undo
Command-Shift-Z     Redo
```

### Board access controls

All boards created using the UI are accessible to anyone with the link. 

Boards with restricted access can currently only be created using the POST API (see below).

## Github Issues Integration

1. Create an r-board and an Area named "new issues" (case insensitive) on the board.
2. Add a webhook to a git repo, namely
    1. Use URL https://r-board.herokuapp.com/api/v1/webhook/github/{board-id}, with board-id from the URL of you board.
    2. Use content type to application/json
    3. Select "Let me select individual events" and pick Issues only.
3. Create a new issue or change labels of an existing issue.
4. You should see new notes appear on your board

## API

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
    "accessPolicy": [
        { email: "coolgirl@reaktor.com" },
        { domain: "reaktor.fi" }
    ]
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
    "replaceTextIfExists": boolean,
    "replaceColorIfExists": boolean
}
```

## Google Authentication integration

Google authentication is supported. To enable this feature, you'll need to supply `GOOGLE_API_KEY` and `GOOGLE_CLIENT_ID` as environment variables

## Dev

Running locally:

```
yarn install
yarn start:dev
```

Run end-to end Cypress tests against the server you just started:

-   `yarn test-e2e:dev` to run once
-   `yarn cypress` to open the Cypress UI for repeated test runs

## Tech stack

-   Typescript
-   [Harmaja](https://github.com/raimohanska/harmaja) frontend library
-   Socket.IO realtime sync
-   Express server
-   Runs on Heroku

## Contribution

See Issues!
