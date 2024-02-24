import { h } from "harmaja"
import * as L from "lonna"
import Quill from "quill"
import QuillCursors from "quill-cursors"
import { QuillBinding } from "y-quill"
import { Board, getItemBackground, TextItem } from "../../../common/src/domain"
import { emptySet } from "../../../common/src/sets"
import { Dispatch } from "../store/board-store"
import { BoardFocus, getSelectedItemIds } from "./board-focus"
import { contrastingColor } from "./contrasting-color"
import { ToolController } from "./tool-selection"
import { CRDTStore } from "../store/crdt-store"

Quill.register("modules/cursors", QuillCursors)

interface CollaborativeTextViewProps {
    item: L.Property<TextItem>
    board: L.Property<Board>
    dispatch: Dispatch
    id: string
    toolController: ToolController
    focus: L.Atom<BoardFocus>
    itemFocus: L.Property<"none" | "selected" | "dragging" | "editing">
    crdtStore: CRDTStore
}
export function CollaborativeTextView({
    id,
    item,
    board,
    dispatch,
    toolController,
    focus,
    itemFocus,
    crdtStore,
}: CollaborativeTextViewProps) {
    const fontSize = L.view(item, (i) => `${i.fontSize ? i.fontSize : 1}em`)
    const color = L.view(item, getItemBackground, contrastingColor)

    const setEditing = (e: boolean) => {
        if (toolController.tool.get() === "connect") return // Don't switch to editing in middle of connecting
        dispatch({ action: "item.front", boardId: board.get().id, itemIds: [id] })
        focus.set(
            e
                ? { status: "editing", itemId: id }
                : { status: "selected", itemIds: new Set([id]), connectionIds: emptySet() },
        )
    }

    const editingThis = L.atom(
        L.view(itemFocus, (f) => f === "editing" || f === "selected"),
        setEditing,
    )

    const quillEditor = L.atom<Quill | null>(null)

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
            theme: "snow", // 'bubble' is also great
        })

        const crdt = crdtStore.getBoardCrdt(board.get().id)
        const ytext = crdt.getField(id, "text")
        new QuillBinding(ytext, quill, crdt.awareness)
        quillEditor.set(quill)
    }

    L.combine(quillEditor, editingThis, (q, e) => (e ? q : null)).forEach((q) => {
        q && q.focus()
    })

    return (
        <div
            className="quill-wrapper text"
            onKeyDown={(e) => e.stopPropagation()}
            onKeyUp={(e) => e.stopPropagation()}
            onKeyPress={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
        >
            <div
                className="quill-editor"
                style={L.combineTemplate({ fontSize, color, width: "100%", height: "100%" })}
                ref={initQuill}
            />
        </div>
    )
}
