import * as H from "harmaja"
import * as L from "lonna"
import { componentScope, h, HarmajaOutput, Fragment } from "harmaja"
import { isURL, sanitizeHTML, createLinkHTML } from "./sanitizeHTML"

export type EditableSpanProps = {
    value: L.Atom<string>
    editingThis: L.Atom<boolean>
    showIcon?: boolean
    commit?: () => void
    cancel?: () => void
} & JSX.DetailedHTMLProps<JSX.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>

const isFirefox = navigator.userAgent.toLowerCase().indexOf("firefox") > -1
function clearSelection() {
    if (!isFirefox) {
        // Don't clear selection on Firefox, because for an unknown reason, the "selectAll" functionality below breaks after first clearSelection call.
        window.getSelection()?.removeAllRanges()
    }
}

export const HTMLEditableSpan = (props: EditableSpanProps) => {
    let { value, editingThis, commit, cancel, ...rest } = props
    const nameElement = L.atom<HTMLSpanElement | null>(null)
    editingThis.pipe(L.changes).forEach((editing) => {
        if (editing) {
            setTimeout(() => {
                nameElement.get()!.focus()
                document.execCommand("selectAll", false)
            }, 1)
        } else {
            clearSelection()
        }
    })

    const updateContent = () => {
        const e = nameElement.get()
        if (!e) return
        e.innerHTML = sanitizeHTML(value.get(), true)
    }

    L.combine(value.pipe(L.applyScope(componentScope())), nameElement, (v, e) => ({ v, e })).forEach(({ v, e }) => {
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
        //editingThis.set(false)
    }
    const onKeyPress = (e: JSX.KeyboardEvent) => {
        e.stopPropagation() // To prevent propagating to higher handlers which, for instance prevent defaults for backspace
    }
    const onClick = (e: JSX.MouseEvent) => {
        if (e.shiftKey) return // Don't mess with multi-select
        e.stopPropagation()
        if (e.target instanceof HTMLAnchorElement) return // Allow links to work
        e.preventDefault()
        editingThis.set(true)
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
        } else if ((e.altKey || e.shiftKey) && e.keyCode === 13) {
            const { atEnd } = getSelectionTextInfo(nameElement.get()!)
            const linebreak = atEnd ? "<br><br>" : "<br>"
            document.execCommand("insertHTML", false, linebreak)
            e.preventDefault()
        } else {
            if (e.keyCode === 13) {
                e.preventDefault()
                commit && commit()
                editingThis.set(false)
            } else if (e.keyCode === 27) {
                // esc
                cancel && cancel()
                editingThis.set(false)
                nameElement.get()!.textContent = value.get()
            }
        }
        e.stopPropagation() // To prevent propagating to higher handlers which, for instance prevent defaults for backspace
    }
    const onKeyUp = onKeyPress
    const onInput = () => {
        value.set(nameElement.get()!.innerHTML || "")
    }
    const onPaste = (e: JSX.ClipboardEvent<HTMLSpanElement>) => {
        e.preventDefault()
        // Paste as plain text, remove formatting.
        var htmlText = e.clipboardData.getData("text/plain")
        if (isURL(htmlText)) {
        }
        const sanitized = isURL(htmlText)
            ? createLinkHTML(htmlText, window.getSelection()!.toString() || undefined)
            : sanitizeHTML(htmlText)
        document.execCommand("insertHTML", false, sanitized)
    }

    return (
        <span onClick={onClick} style={{ cursor: "pointer" }} {...rest}>
            {!!props.showIcon && <span className="icon edit" style={{ marginRight: "0.3em", fontSize: "0.8em" }} />}
            <span
                className="editable"
                onBlur={onBlur}
                contentEditable={editingThis}
                style={L.view(value, (v) => (v ? {} : { display: "inline-block", minWidth: "1em", minHeight: "1em" }))}
                ref={nameElement.set}
                onKeyPress={onKeyPress}
                onKeyUp={onKeyUp}
                onKeyDown={onKeyDown}
                onInput={onInput}
                onPaste={onPaste}
                onDoubleClick={(e) => {
                    e.stopPropagation()
                }}
            ></span>
        </span>
    )
}

export const If = ({
    condition,
    component,
}: {
    condition: L.Property<boolean>
    component: () => H.HarmajaOutput
}): HarmajaOutput => {
    return condition.pipe(L.map((c) => (c ? component() : [])))
}

export const IfElse = ({
    condition,
    ifTrue,
    ifFalse,
}: {
    condition: L.Property<boolean>
    ifTrue: () => H.HarmajaOutput
    ifFalse: () => H.HarmajaOutput
}) => {
    return condition.pipe(L.map((c) => (c ? ifTrue() : ifFalse())))
}

// source: https://stackoverflow.com/questions/7451468/contenteditable-div-how-can-i-determine-if-the-cursor-is-at-the-start-or-end-o/7478420#7478420
function getSelectionTextInfo(el: HTMLElement) {
    var atStart = false,
        atEnd = false
    var selRange, testRange
    var sel = window.getSelection()
    if (sel?.rangeCount) {
        selRange = sel.getRangeAt(0)
        testRange = selRange.cloneRange()

        testRange.selectNodeContents(el)
        testRange.setEnd(selRange.startContainer, selRange.startOffset)
        atStart = testRange.toString() == ""

        testRange.selectNodeContents(el)
        testRange.setStart(selRange.endContainer, selRange.endOffset)
        atEnd = testRange.toString() == ""
    }
    return { atStart: atStart, atEnd: atEnd }
}
