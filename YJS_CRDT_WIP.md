The Y.js based collaborative editing support is under construction.

## Design

-   Use 1 Y.js CRDT document per board to represent collaboratively edited text. Each document contains the `text` property of each collaboratively edited item. The approach can be scaled to include other fields too. Maybe all fields at some point if the approach proves good.
-   Use Quill editor and [y-quill](https://github.com/yjs/y-quill) for integrating the editor with the Y.js CRDT
-   Use [y-websocket](https://github.com/yjs/y-websocket) client for connecting the Y.js CRDT with the server
-   Port the [y-websocket server](https://github.com/yjs/y-websocket/blob/master/bin/server.js) to TypeScript and into this codebase (see backend/src/y-websocket-server). Customize as necessary
-   Use Cookies for associating Y.js websockets with Ourboard websockets by sessionId
-   Persist CRDTs as diffs, that go along the "event bundles" we store as database rows. Consider additionally storing a snapshot of the whole CRDT

## TODO

Must-haves

-   UI: Manage focus etc. Now selection goes directly to text edit mode, even in multiselect. Make test stricter on that the initial text is shown and correctly replaced. Select all text on click.
-   Undo buffer integration
-   Manage session on the server side: terminate YJS sockets when websocket session is terminated
-   Performance testing
-   Playwright tests

Nice-to-haves

-   Persistence: consider storing CRDT snapshot
-   Persistence: make sure the compactor works
-   UI: Show proper username by the cursor when hovering. Now shows some large number
-   UI: Add a formatting toolbar. Needs some styling - if you now enable toolbar in Quill, it looks broken
-   Storage requirement measurements
-   Sharing: split the TypeScript y-websocket server into a separate shared module for others to enjoy
