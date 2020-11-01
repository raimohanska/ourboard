import * as H from "harmaja";
import * as L from "lonna";
import { componentScope, h, HarmajaOutput } from "harmaja";

export const TextInput = (props: { value: L.Atom<string> } & any) => {
    return <input {...{
        type: props.type || "text" ,
        onInput: e => {
            props.value.set(e.currentTarget.value)
        },
        ...props,
        value: props.value
    }} />
};

export const TextArea = (props: { value: L.Atom<string> } & any) => {
    return <textarea {...{
        onInput: e => {
            props.value.set(e.currentTarget.value)
        },
        ...props,
        value: props.value
    }} />
};

export const Checkbox = (props: { checked: L.Atom<boolean> }) => {
    return <a 
        className={props.checked.pipe(L.map((c: boolean) => c ? "checkbox checked" : "checkbox"))} 
        onClick={ () => props.checked.modify((c: boolean) => !c)}
    />    
};  


export type EditableSpanProps = { 
    value: L.Atom<string>, 
    editingThis: L.Atom<boolean>, 
    showIcon?: boolean,
    commit?: () => void, 
    cancel?: () => void 
} & JSX.DetailedHTMLProps<JSX.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>


export const EditableSpan = ( props : EditableSpanProps) => {
    let { value, editingThis, commit, cancel, ...rest } = props
    const nameElement = L.atom<HTMLSpanElement | null>(null)
    let settingLocally = false
    const onClick = (e: JSX.MouseEvent) => {
        if (e.shiftKey) return
        editingThis.set(true)
        e.preventDefault()
        //e.stopPropagation()
    }  
    editingThis.pipe(L.changes, L.filter(e => !!e), L.applyScope(componentScope())).forEach(() =>  { 
        setTimeout(() => {
            nameElement.get()!.focus() 
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
           nameElement.get()!.textContent = value.get()
        }
    }
    const onInput = (e: JSX.InputEvent<HTMLSpanElement>) => {
        settingLocally = true        
        value.set(e.currentTarget!.textContent || "")
        settingLocally = false
    }    

    return <span 
        onClick={onClick} 
        style={{ cursor: "pointer" }}
        {...rest }
    >
        { props.showIcon ? <span className="icon edit" style={{ marginRight: "0.3em", fontSize: "0.8em" }}/> : null }
        <span 
            onBlur={endEditing}
            contentEditable={editingThis} 
            ref={ nameElement.set } 
            onKeyPress={onKeyPress}
            onKeyUp={onKeyPress}
            onInput={onInput}
        >
            {props.value.pipe(L.filter(() => !settingLocally, componentScope()))}
        </span>
    </span>
}

export const If = ({ condition, component }: { condition: L.Property<boolean>, component: () => H.HarmajaOutput}): HarmajaOutput => {
    return condition.pipe(L.map(c => c ? component() : []))
}

export const IfElse = ({ condition, ifTrue, ifFalse }: { condition: L.Property<boolean>, ifTrue: () => H.HarmajaOutput, ifFalse: () => H.HarmajaOutput}) => {
    return condition.pipe(L.map(c => c ? ifTrue() : ifFalse()))
}