An online whiteboard.

Feel free to try at https://r-board.herokuapp.com/

## Features and User Guide

TODO

## Github Issues Integration

1. Create an r-board and an Area named "new issues" (case insensitive) on the board.
2. Add a webhook to a git repo, namely
    2.1. Use URL https://r-board.herokuapp.com/api/v1/webhook/github/{board-id}, with board-id from the URL of you board.
    2.2. Use content type to application/json
    2.3. Select "Let me select individual events" and pick Issues only.
3. Create a new issue or change labels of an existing issue.
4. You should see new notes appear on your board

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
