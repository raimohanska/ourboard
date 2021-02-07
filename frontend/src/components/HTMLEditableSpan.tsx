import * as H from "harmaja";
import * as L from "lonna";
import { componentScope, h, HarmajaOutput, Fragment } from "harmaja";
import { sanitizeHTML } from "./sanitizeHTML"
import { onClickOutside } from "./onClickOutside";

export type EditableSpanProps = { 
    value: L.Atom<string>, 
    editingThis: L.Atom<boolean>, 
    showIcon?: boolean,
    commit?: () => void, 
    cancel?: () => void 
} & JSX.DetailedHTMLProps<JSX.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>

const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
function clearSelection(){
    if (!isFirefox) { // Don't clear selection on Firefox, because for an unknown reason, the "selectAll" functionality below breaks after first clearSelection call.
        window.getSelection()?.removeAllRanges()
    }
}

export const HTMLEditableSpan = ( props : EditableSpanProps) => {
    let { value, editingThis, commit, cancel, ...rest } = props    
    const nameElement = L.atom<HTMLSpanElement | null>(null)
    editingThis.pipe(L.changes).forEach((editing) =>  { 
        if (editing) {
            setTimeout(() => {
                nameElement.get()!.focus() 
                document.execCommand('selectAll',false)    
            }, 1)
        } else {
            clearSelection()
        }
    })

    const updateContent = () => {
        const e = nameElement.get()
        if (!e) return
        e.innerHTML = sanitizeHTML(value.get(), true)
        createWidgets()
    }

    L.combine(value.pipe(L.applyScope(componentScope())), nameElement, (v, e) => ({v, e})).forEach(({v, e }) => {
        if (!e) return
        if (e.innerHTML != v) {
            updateContent()
        }
    })
    editingThis.pipe(L.changes, L.filter(e => !e), L.applyScope(componentScope())).forEach(updateContent)

    const createWidgets = () => {
        nameElement.get()!.childNodes.forEach(childNode => {
            if (childNode instanceof HTMLAnchorElement) {
                const anchorElement = childNode
                // replace anchor elem with the component
                H.mount(<LinkMenu href={anchorElement.href} text={anchorElement.textContent!} onInput={onInput} onEdit={() => editingThis.set(true)}/>, anchorElement) 
                // TODO: the mount is never unmounted. However, Harmaja should find this component when unmounting a larger context.                
            }
        })
    }

    const onBlur = (e: JSX.FocusEvent) => {
        //editingThis.set(false)
    }
    const onKeyPress = (e: JSX.KeyboardEvent) => {        
        e.stopPropagation() // To prevent propagating to higher handlers which, for instance prevent defaults for backspace
    }
    const onClick = (e: JSX.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.shiftKey) return
        if (e.target instanceof HTMLAnchorElement) return
        editingThis.set(true)
    }      
    const onKeyDown = (e: JSX.KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === "b") {
                document.execCommand('bold',false);
                e.preventDefault();
            }
            if (e.key === "i") {
                document.execCommand('italic',false);
                e.preventDefault();
            }
        } else if ((e.altKey || e.shiftKey) && e.keyCode === 13) {            
            const { atEnd } = getSelectionTextInfo(nameElement.get()!)
            const linebreak = atEnd ? "<br><br>" : "<br>";
            document.execCommand('insertHTML',false, linebreak);
            e.preventDefault();
        } else {
            if (e.keyCode === 13){ 
                e.preventDefault(); 
                commit && commit()
                editingThis.set(false)
            } else if (e.keyCode === 27) { // esc           
               cancel && cancel()
               editingThis.set(false)
               nameElement.get()!.textContent = value.get()
            }
        }
        e.stopPropagation() // To prevent propagating to higher handlers which, for instance prevent defaults for backspace
    }
    const onKeyUp = onKeyPress
    const onInput = () => {
        value.set(nameElement.get()!.innerHTML || "")
    }    
    const onPaste = (e: JSX.ClipboardEvent<HTMLSpanElement>) => {
        e.preventDefault();
        // Paste as plain text, remove formatting.
        var htmlText = e.clipboardData.getData('text/plain');            
        const sanitized = sanitizeHTML(htmlText, true) // also linkifies, but doesn't add the link menu
        document.execCommand("insertHTML", false, sanitized);
        createWidgets() // to create the LinkMenu for the new link 
    }

    return <span 
        onClick={onClick} 
        style={{ cursor: "pointer" }}
        {...rest }
    >
        
        { !!props.showIcon && <span className="icon edit" style={{ marginRight: "0.3em", fontSize: "0.8em" }}/> }
        <span 
            className="editable"
            onBlur={onBlur}
            contentEditable={editingThis}
            style={L.view(value, v => v ? {} : { display: "inline-block", minWidth: "1em", minHeight:"1em" })}
            ref={ nameElement.set } 
            onKeyPress={onKeyPress}
            onKeyUp={onKeyUp}
            onKeyDown={onKeyDown}
            onInput={onInput}
            onPaste={onPaste}
        >
        </span>
        
    </span>
}

export const If = ({ condition, component }: { condition: L.Property<boolean>, component: () => H.HarmajaOutput}): HarmajaOutput => {
    return condition.pipe(L.map(c => c ? component() : []))
}

export const IfElse = ({ condition, ifTrue, ifFalse }: { condition: L.Property<boolean>, ifTrue: () => H.HarmajaOutput, ifFalse: () => H.HarmajaOutput}) => {
    return condition.pipe(L.map(c => c ? ifTrue() : ifFalse()))
}

// source: https://stackoverflow.com/questions/7451468/contenteditable-div-how-can-i-determine-if-the-cursor-is-at-the-start-or-end-o/7478420#7478420
function getSelectionTextInfo(el: HTMLElement) {
    var atStart = false, atEnd = false;
    var selRange, testRange;
    var sel = window.getSelection();
    if (sel?.rangeCount) {
        selRange = sel.getRangeAt(0);
        testRange = selRange.cloneRange();

        testRange.selectNodeContents(el);
        testRange.setEnd(selRange.startContainer, selRange.startOffset);
        atStart = (testRange.toString() == "");

        testRange.selectNodeContents(el);
        testRange.setStart(selRange.endContainer, selRange.endOffset);
        atEnd = (testRange.toString() == "");
    }
    return { atStart: atStart, atEnd: atEnd };
}

const LinkMenu = ({ href, text, onInput, onEdit }: { href: string, text: string, onInput: () => void, onEdit: () => void}) => {
    // TODO: implement edit
    // TODO: write about Harmaja integration into vanilla!
    const element = L.atom<HTMLElement | null>(null)
    const status = L.atom<"linked"|"menu"|"edit"|"unlinked">("linked")        
    const onLinkClick = (e: JSX.MouseEvent) => {
        status.modify(s => s == "menu" ? "linked" : "menu")
        onEdit()
        e.preventDefault()
    }
    const unlink = () => {
        status.set("unlinked")
        onInput() // sync content
    }
    const edit = () => {
        status.set("edit")
    }
    onClickOutside(element, () => {
        status.modify(s => s == "unlinked" ? s : "linked")
        onInput() // sync content
    })
    const nameEdit = L.atom(text)
    const hrefEdit = L.atom(href)

    return <span className="anchor-container" contentEditable={false} ref={e => { element.set(e); stopEventPropagation(e) }}>
        {
            L.view(status, s => s == "unlinked"
                ? nameEdit
                : <>
                { (s == "menu" || s == "edit") && <div className={L.view(status, s => s ? "anchor-menu" : "anchor-menu hidden")}>
                    <a href={hrefEdit} target="_blank">{ nameEdit }</a>
                    <a onClick={e => { navigator.clipboard.writeText(hrefEdit.get()) }} className="icon copy" title="Copy link"/>
                    <a onClick={edit} className="icon edit" title="Edit link"/>
                    <a onClick={unlink} className="icon unlink" title="Unlink"/>

                    { s === "menu"
                        ? <>
                        </>
                        : <div className="anchor-edit" 
                                onClick={e => e.stopPropagation()} 
                                onMouseDown={e => e.stopPropagation()}
                            >
                            <label>Text <TextInput value={nameEdit}/></label>
                            <label>URL <TextInput value={hrefEdit}/></label>
                          </div>
                    }
                </div> }                 
                <a href={hrefEdit} target="_blank" onClick={onLinkClick}>{ nameEdit }</a>
                </>
            )
        }         
    </span>
}

export const TextInput = (props: { value: L.Atom<string> } & any) => {
    return <input {...{
        type: props.type || "text" ,
        onInput: e => {
            props.value.set(e.currentTarget.value)
            e.stopPropagation()
        },
        ...props,
        value: props.value
    }} />
};

const stopEventPropagation = (el: HTMLElement) => {
    ["onclick", "onmousedown", "onmouseup", "onkeydown", "onkeyup", "onkeypress", "ondragstart", "ondrag", "ondragend", "oninput", "onblur"].forEach(name => {
        (el as any)[name] = (e: Event) => {
            console.log("BLOCKING", name)
            e.stopPropagation()
        }
    })
}

const EventBarrier = ({ children }: { children: any }) => {
    return <span ref={stopEventPropagation}>
        { children }
    </span>
}