import { componentScope, h } from "harmaja"
import * as L from "lonna"
import Quill from "quill"
import QuillCursors from "quill-cursors"
import { QuillBinding } from "y-quill"
import {
    AccessLevel,
    Board,
    TextItem,
    canWrite,
    getAlign,
    getHorizontalAlign,
    getItemBackground,
} from "../../../common/src/domain"
import { CRDTStore } from "../store/crdt-store"
import { getAlignItems } from "./ItemView"
import { BoardFocus } from "./board-focus"
import { contrastingColor } from "./contrasting-color"
import { preventDoubleClick } from "./double-click"
import PasteLinkOverText from "./quillPasteLinkOverText"

Quill.register("modules/cursors", QuillCursors)
Quill.register("modules/pasteLinkOverText", PasteLinkOverText)

interface CollaborativeTextViewProps {
    item: L.Property<TextItem>
    board: L.Property<Board>
    id: string
    accessLevel: L.Property<AccessLevel>
    focus: L.Atom<BoardFocus>
    itemFocus: L.Property<"none" | "selected" | "dragging" | "editing">
    crdtStore: CRDTStore
    isLocked: L.Property<boolean>
}
export function CollaborativeTextView({
    id,
    item,
    board,
    accessLevel,
    focus,
    itemFocus,
    isLocked,
    crdtStore,
}: CollaborativeTextViewProps) {
    const fontSize = L.view(item, (i) => `${i.fontSize ? i.fontSize : 1}em`)
    const color = L.view(item, getItemBackground, contrastingColor)

    const quillEditor = L.atom<Quill | null>(null)

    accessLevel.applyScope(componentScope()).forEach((al) => {
        quillEditor.get()?.enable(canWrite(al))
    })

    function initQuill(el: HTMLElement) {
        const quill = new Quill(el, {
            modules: {
                cursors: true,
                toolbar: false,
                pasteLinkOverText: true,
                history: {
                    userOnly: true, // Local undo shouldn't undo changes from remote users
                },
            },
            theme: "snow",
            readOnly: !canWrite(accessLevel.get()),
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
                const multipleLines =
                    q
                        .getText()
                        .split("\n")
                        .filter((x) => x).length > 1
                if (!multipleLines) {
                    // For one-liners, select the whole text on double click
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

    const pointerEvents = L.view(itemFocus, isLocked, (f, l) =>
        f === "editing" || f === "selected" || l ? "auto" : "none",
    )
    const hAlign = L.view(item, getAlign, getHorizontalAlign).applyScope(componentScope())
    hAlign.onChange((align) => {
        quillEditor.get()?.formatText(0, 10000000, "align", align === "left" ? "" : align)
    })

    let touchMoves = 0

    return (
        <div
            className="quill-wrapper text"
            onKeyUp={(e) => {
                e.stopPropagation()
                if (e.key === "Escape") {
                    focus.set({ status: "selected", itemIds: new Set([id]), connectionIds: new Set() })
                }
            }}
            onKeyDown={(e) => {
                e.stopPropagation()
            }}
            onKeyPress={(e) => {
                e.stopPropagation()
            }}
            onDoubleClick={(e) => {
                e.stopPropagation()
                quillEditor.get()?.focus()
            }}
            onTouchStart={(e) => {
                preventDoubleClick(e)
                touchMoves = 0
            }}
            onTouchMove={() => touchMoves++}
            onTouchEnd={() => {
                if (touchMoves === 0) {
                    // This is a way to detect a tap (vs swipe)
                    quillEditor.get()?.focus()
                }
            }}
            onClick={handleClick}
            style={L.combineTemplate({ alignItems: L.view(item, getAlignItems) })}
        >
            <div
                className="quill-editor"
                style={L.combineTemplate({ fontSize, color, pointerEvents })}
                ref={initQuill}
            />
        </div>
    )
}
