## Challenges

-   Not your typical web form
-   Changes to board state, user cursors and locks synced between multiple clients
-   Changes must be immediate locally for snappy UI
-   Drag 100 items in realtime, [100 cursors moving wildly](https://youtu.be/TRT9w5c0Rp0)
-   Undo and Redo
-   Offline support would be nice

## Solution

-   Mutations as data, i.e. events based sync
-   Events as discriminated union in TypeScript { action: "item.move" ... }
-   Reducer on all clients and server
-   Server reducer validates actions, then broadcasts
-   Non-shared state using local Atoms and localStorage

## Using Lonna / FRP

-   [`uiEvents: L.Bus<AppEvent>`](https://github.com/raimohanska/r-board/blob/master/frontend/src/store/board-store.ts#L45) for dispatching local events from the UI. The dispatch function is passed to UI components
-   uiEvents except for Undo/Redo are enqueued to [message-queue](https://github.com/raimohanska/r-board/blob/master/frontend/src/store/message-queue.ts)
-   [eventsReducer](https://github.com/raimohanska/r-board/blob/master/frontend/src/store/board-store.ts#L96) function handles all events that update local state
-   persistable board item events are handled by the [boardReducer](https://github.com/raimohanska/r-board/blob/master/common/src/board-reducer.ts) "subreducer"
-   using the reducer we get [`state: L.Property<BoardAppState>`](https://github.com/raimohanska/r-board/blob/master/frontend/src/store/board-store.ts#L180)
-   from this property, different slices (board, locks, history, userId) are used around the [UI](https://github.com/raimohanska/r-board/blob/master/frontend/src/board/BoardView.tsx#L56)
-   Read-write Atoms are created for client-local state:
    -   [`const zoom = L.atom(1)`](https://github.com/raimohanska/r-board/blob/master/frontend/src/board/BoardView.tsx#L61)
    -   [`focus`](https://github.com/raimohanska/r-board/blob/master/frontend/src/board/BoardView.tsx#L70) is a dependent atom, allows you to set "select these items" but only the actually selectable ones end up selected and the selection can be further narrowed when circumstances (locks for instance) change
-   [Server-side connection handler](https://github.com/raimohanska/r-board/blob/master/backend/src/connection-handler.ts)

## More

-   Undo/redo: boardReducer returns a possible "undo action" that is put to undo stack
-   Action buffering: client pushes local actions to message-queue that sends them one-by-one to server, waiting for an ack for each before ditching. Allows retry in case of connection failure, so local changes are not lost. The queue is not persisted at the moment, but could be for true offline support.
-   Action folding: redundant actions are folded in the buffer. For instance two moves for the same item.
-   Smart sync: server assigns a serial number to all actions and returns that in the Ack. Client maintains a Snapshot with the latest serial and stores this locally. On re-connect it requests only events occurred after the locally stored serial. No need to re-fetch the full board state on connect.
-   Server-side state management: active boards (== has sockets) are kept in memory. Reducer run for validation before dispatching. State is stored to DB primarily as events, which are sent in 1 second bundles to PostgreSQL. When board is loaded to memory, events are replayed through the reducer to come up with the most current state. Snapshots are used for faster bootstrap to avoid looping through 1000s of events on a regular basis.
-   Assets stored on S3

## Proofing

-   Cypress integration test involving client and server (actually catches bugs)
-   Performance tester: 100 cursors (SHOW!)
