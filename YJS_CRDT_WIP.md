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

-   UI: Copy-pasting items should copy CRDT as well. Most likely we want to keep the item.text up to date locally with CRDT items, even though we do not dispatch updates to the server.
-   Undo buffer integration. Editor has its own local undo but we should also add the full edit as a global undo item
-   Board level flag for CRDT or other controlled way of rolling this out
-   Mobile check
-   Manage session on the server side: terminate YJS sockets when websocket session is terminated
-   APIs
-   Performance testing
-   Playwright tests (create text, reload, change, reload, use two clients, clear indexeddb and reload...)
-   Include API basic tests in Playwright tests

Nice-to-haves

-   Persistence: consider storing CRDT snapshot
-   Persistence: make sure the compactor works
-   UI: Show proper username by the cursor when hovering. Now shows some large number
-   UI: Add a formatting toolbar. Needs some styling - if you now enable toolbar in Quill, it looks broken
-   Storage requirement measurements
-   Sharing: split the TypeScript y-websocket server into a separate shared module for others to enjoy
