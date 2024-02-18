import { h } from "harmaja"
import * as L from "lonna"
import { Board, getItemBackground, TextItem } from "../../../common/src/domain"
import { emptySet } from "../../../common/src/sets"
import { Dispatch } from "../store/board-store"
import { BoardFocus, getSelectedItemIds } from "./board-focus"
import { contrastingColor } from "./contrasting-color"
import { ToolController } from "./tool-selection"
import * as Y from "yjs"
import { QuillBinding } from "y-quill"
import Quill from "quill"
import QuillCursors from "quill-cursors"
import { WebsocketProvider } from "y-websocket"
Quill.register("modules/cursors", QuillCursors)

interface CollaborativeTextViewProps {
    item: L.Property<TextItem>
    board: L.Property<Board>
    dispatch: Dispatch
    id: string
    toolController: ToolController
    focus: L.Atom<BoardFocus>
}
export function CollaborativeTextView({
    id,
    item,
    board,
    dispatch,
    toolController,
    focus,
}: CollaborativeTextViewProps) {
    const textAtom = L.atom(L.view(item, "text"), (text) =>
        dispatch({ action: "item.update", boardId: board.get().id, items: [{ id, text }] }),
    )
    const showCoords = false
    const focused = L.view(focus, (f) => getSelectedItemIds(f).has(id))

    const setEditing = (e: boolean) => {
        if (toolController.tool.get() === "connect") return // Don't switch to editing in middle of connecting
        dispatch({ action: "item.front", boardId: board.get().id, itemIds: [id] })
        focus.set(
            e
                ? { status: "editing", itemId: id }
                : { status: "selected", itemIds: new Set([id]), connectionIds: emptySet() },
        )
    }
    const color = L.view(item, getItemBackground, contrastingColor)

    function initQuill(el: HTMLElement) {
        const quill = new Quill(el, {
            modules: {
                cursors: true,
                //toolbar: [
                // adding some basic Quill content features
                //[{ header: [1, 2, false] }],
                //["bold", "italic", "underline"],
                //["image", "code-block"],
                //],
                toolbar: false,
                history: {
                    // Local undo shouldn't undo changes
                    // from remote users
                    userOnly: true,
                },
            },
            placeholder: "Start collaborating...",
            theme: "snow", // 'bubble' is also great
        })
        // A Yjs document holds the shared data
        const ydoc = new Y.Doc()
        // Define a shared text type on the document
        const ytext = ydoc.getText(`${id}.text`)

        // connect to the public demo server (not in production!)
        const provider = new WebsocketProvider( // TODO: get socket address from server-connection.ts
        `ws://localhost:1337/socket/yjs`, `board/${board.get().id}`, ydoc, { connect: true })

        provider.on("status", (event: any) => {
            console.log("YJS Provider status", event.status)
        })

        // Create an editor-binding which
        // "binds" the quill editor to a Y.Text type.
        const binding = new QuillBinding(ytext, quill, provider.awareness)
    }

    return (
        <div
            className="quill-wrapper"
            style={{ width: "100%", height: "100%", padding: "0 1em" }}
            onKeyDown={(e) => e.stopPropagation()}
            onKeyUp={(e) => e.stopPropagation()}
            onKeyPress={(e) => e.stopPropagation()}
        >
            <div className="quill-editor" style={{ width: "100%", height: "100%" }} ref={initQuill} />
        </div>
    )
}
