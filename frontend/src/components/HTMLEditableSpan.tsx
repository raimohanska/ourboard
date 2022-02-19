import * as H from "harmaja"
import * as L from "lonna"
import { componentScope, h } from "harmaja"
import { isURL, sanitizeHTML, createLinkHTML } from "./sanitizeHTML"
import { IS_TOUCHSCREEN } from "../board/touchScreen"

export type EditableSpanProps = {
    value: L.Atom<string>
    editingThis: L.Atom<boolean>
    editable: L.Property<boolean>
}

const isFirefox = navigator.userAgent.toLowerCase().indexOf("firefox") > -1
function clearSelection() {
    if (!isFirefox) {
        // Don't clear selection on Firefox, because for an unknown reason, the "selectAll" functionality below breaks after first clearSelection call.
        window.getSelection()?.removeAllRanges()
    }
}

export const HTMLEditableSpan = (props: EditableSpanProps) => {
    let { value, editingThis, editable } = props
    const editableElement = L.atom<HTMLSpanElement | null>(null)
    editingThis.pipe(L.changes).forEach((editing) => {
        if (editing) {
            setTimeout(() => {
                editableElement.get()!.focus()
                if (!IS_TOUCHSCREEN) {
                    // On iPhone at least the selectAll command prevent the keyboard from showing up
                    document.execCommand("selectAll", false)
                }
            }, 1)
        } else {
            clearSelection()
        }
    })

    const updateContent = () => {
        const e = editableElement.get()
        if (!e) return
        e.innerHTML = sanitizeHTML(value.get(), true)
    }

    L.combine(value.pipe(L.applyScope(componentScope())), editableElement, (v, e) => ({ v, e })).forEach(({ v, e }) => {
        if (!e) return
        if (e.innerHTML != v) {
            updateContent()
        }
    })
    editingThis
        .pipe(
            L.changes,
            L.filter((e) => !e),
            L.applyScope(componentScope()),
        )
        .forEach(updateContent)

    const onBlur = (e: JSX.FocusEvent) => {
        // In Safari, Chrome, some spaces end up being non-breaking spaces in case of pasting content
        // vs typing it. Didn't find a better way to fix it yet. Replacing innerHTML while editing would
        // mess up cursor position, so we replace the nbsps onBlur instead.
        const content = value.get()
        const fixed = content.replaceAll("&nbsp;", " ")
        if (fixed !== content) {
            value.set(fixed)
        }
    }
    const onKeyPress = (e: JSX.KeyboardEvent) => {
        e.stopPropagation() // To prevent propagating to higher handlers which, for instance prevent defaults for backspace
    }

    const onKeyDown = (e: JSX.KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === "b") {
                document.execCommand("bold", false)
                e.preventDefault()
            }
            if (e.key === "i") {
                document.execCommand("italic", false)
                e.preventDefault()
            }
        } else if (e.key === "Escape") {
            // esc
            editingThis.set(false)
        }
        e.stopPropagation() // To prevent propagating to higher handlers which, for instance prevent defaults for backspace
    }
    const onKeyUp = onKeyPress
    const onInput = () => {
        value.set(editableElement.get()!.innerHTML || "")
    }
    const onPaste = (e: JSX.ClipboardEvent<HTMLSpanElement>) => {
        e.preventDefault()
        // Paste as plain text, remove formatting.
        var htmlText = e.clipboardData.getData("text/html") || e.clipboardData.getData("text/plain")
        const sanitized = isURL(htmlText)
            ? createLinkHTML(htmlText, window.getSelection()!.toString() || undefined)
            : sanitizeHTML(htmlText)
        document.execCommand("insertHTML", false, sanitized)
    }

    const onTouch = (e: JSX.TouchEvent) => {
        if (!editingThis.get()) {
            editingThis.set(true)
        }
        e.stopPropagation()
    }

    return (
        <span style={{ cursor: "pointer" }}>
            <span
                className="editable"
                onBlur={onBlur}
                contentEditable={L.and(editingThis, editable)}
                style={L.view(value, (v) => (v ? {} : { display: "inline-block", minWidth: "1em", minHeight: "1em" }))}
                ref={editableElement.set}
                onKeyPress={onKeyPress}
                onKeyUp={onKeyUp}
                onKeyDown={onKeyDown}
                onInput={onInput}
                onPaste={onPaste}
                onTouchStart={onTouch}
                onTouchEnd={onTouch}
                onTouchCancel={onTouch}
                onDoubleClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    editingThis.set(true)
                }}
            ></span>
        </span>
    )
}
