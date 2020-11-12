import * as H from "harmaja";
import * as L from "lonna";
import { componentScope, h, HarmajaOutput } from "harmaja";

export type EditableSpanProps = { 
    value: L.Atom<string>, 
    editingThis: L.Atom<boolean>, 
    showIcon?: boolean,
    commit?: () => void, 
    cancel?: () => void 
} & JSX.DetailedHTMLProps<JSX.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>

export const EditableSpan = ( props : EditableSpanProps) => {
    let { value, editingThis, commit, cancel, ...rest } = props
    let nameElement: HTMLSpanElement | null = null
    let settingLocally = false
    const onClick = (e: JSX.MouseEvent) => {
        if (e.shiftKey) return
        editingThis.set(true)
        e.preventDefault()
        e.stopPropagation()
    }  
    editingThis.pipe(L.changes, L.filter(e => !!e), L.applyScope(componentScope())).forEach(() =>  { 
        setTimeout(() => {
            nameElement!.focus() 
            document.execCommand('selectAll',false)    
        }, 1)
    })

    const endEditing = () => {
        editingThis.set(false)
    }
    const onKeyPress = (e: JSX.KeyboardEvent) => {
        if (e.keyCode === 13){ 
            e.preventDefault(); 
            commit && commit()
            editingThis.set(false)
        } else if (e.keyCode === 27) { // esc           
           cancel && cancel()
           editingThis.set(false)
           nameElement!.textContent = value.get()
        }
        e.stopPropagation() // To prevent propagating to higher handlers which, for instance prevent defaults for backspace
    }
    const onKey = (e: JSX.KeyboardEvent) => {
        e.stopPropagation() // To prevent propagating to higher handlers which, for instance prevent defaults for backspace
    }
    const onInput = (e: JSX.InputEvent<HTMLSpanElement>) => {
        settingLocally = true        
        value.set(e.currentTarget!.textContent || "")
        settingLocally = false
    }   

    // TODO: come up with a nicer way to deal with contentEditable fields with Harmaja.
    // Observable embedding doesn't work because when use deletes the whole text, the Text node is
    // detached from DOM and Harmaja keeps trying to track an out-of-date Text node.
    const scope = componentScope()
    const ref = (el: HTMLElement) => {
        nameElement = el        
        value.pipe(L.applyScope(scope)).forEach(v => {
            if (!settingLocally) {
                el.textContent = v
            }
        })
    } 

    return <span 
        onClick={onClick} 
        style={{ cursor: "pointer" }}
        {...rest }
    >
        { !!props.showIcon && <span className="icon edit" style={{ marginRight: "0.3em", fontSize: "0.8em" }}/> }
        <span 
            onBlur={endEditing}
            contentEditable={editingThis} 
            ref={ ref } 
            onKeyPress={onKeyPress}
            onKeyUp={onKeyPress}
            onKeyDown={onKey}
            onInput={onInput}
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