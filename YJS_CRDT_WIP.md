The Y.js based collaborative editing support is under construction.

## Design

-   Use 1 Y.js CRDT document per board to represent collaboratively edited text. Each document contains the `text` property of each collaboratively edited item. The approach can be scaled to include other fields too. Maybe all fields at some point if the approach proves good.
-   Use Quill editor and [y-quill](https://github.com/yjs/y-quill) for integrating the editor with the Y.js CRDT
-   Use [y-websocket](https://github.com/yjs/y-websocket) client for connecting the Y.js CRDT with the server
-   Port the [y-websocket server](https://github.com/yjs/y-websocket/blob/master/bin/server.js) to TypeScript and into this codebase (see backend/src/y-websocket-server). Customize as necessary
-   Use Cookies for associating Y.js websockets with Ourboard websockets by sessionId
-   Persist CRDTs as diffs, that go along the "event bundles" we store as database rows. Consider additionally storing a snapshot of the whole CRDT

## TODO

-   Persistence: store diffs to event bundles. Figure out how the compactor should work. Can diffs just be concatenated?
-   Persistence: boot the SharedDoc based on stored diffs
-   Persistence: consider storing CRDT snapshot
-   Domain: Tag the CRDT based item (properties)
-   Domain: Use a separate CRDT field for each item/property. All stored in the single document.
-   Domain: Consider if CRDT field values should also be included in the JSON presentation, maybe on save
-   Undo buffer integration
-   Manage session on client side: connect only when we have a sessionId. When it changes, reconnect.
-   Manage session on the server side: terminate YJS sockets when websocket session is terminated
-   Performance testing
-   Storage requirement measurements
-   Playwright tests
