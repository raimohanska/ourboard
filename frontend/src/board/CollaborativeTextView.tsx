import { h } from "harmaja"
import * as L from "lonna"
import Quill from "quill"
import QuillCursors from "quill-cursors"
import { QuillBinding } from "y-quill"
import { Board, getItemBackground, TextItem } from "../../../common/src/domain"
import { emptySet } from "../../../common/src/sets"
import { Dispatch } from "../store/board-store"
import { CRDTStore } from "../store/crdt-store"
import { BoardFocus } from "./board-focus"
import { contrastingColor } from "./contrasting-color"
import { ToolController } from "./tool-selection"

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

    const quillEditor = L.atom<Quill | null>(null)

    function initQuill(el: HTMLElement) {
        const quill = new Quill(el, {
            modules: {
                cursors: true,
                toolbar: false,
                history: {
                    userOnly: true, // Local undo shouldn't undo changes from remote users
                },
            },
            theme: "snow",
        })

        const crdt = crdtStore.getBoardCrdt(board.get().id)
        const ytext = crdt.getField(id, "text")
        new QuillBinding(ytext, quill, crdt.awareness)
        quillEditor.set(quill)
    }

    const editingThis = L.view(itemFocus, (f) => f === "editing")

    editingThis.forEach((e) => {
        const q = quillEditor.get()
        if (q) {
            if (e) {
                if (item.get().type === "container") {
                    // For containers, select all text for quick rename
                    q.setSelection(0, 1000000)
                }
            } else {
                // Clear text selecting when not editing
                q.setSelection(null as any)
            }
        }
    })

    function handleClick() {
        if (itemFocus.get() === "selected") {
            focus.set({ status: "editing", itemId: id })
        }
    }

    const pointerEvents = L.view(itemFocus, (f) => (f === "editing" || f === "selected" ? "auto" : "none"))

    return (
        <div
            className="quill-wrapper text"
            onKeyDown={(e) => e.stopPropagation()}
            onKeyUp={(e) => e.stopPropagation()}
            onKeyPress={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onClick={handleClick}
        >
            <div
                className="quill-editor"
                style={L.combineTemplate({ fontSize, color, pointerEvents })}
                ref={initQuill}
            />
        </div>
    )
}
