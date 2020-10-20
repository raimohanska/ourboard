import * as H from "harmaja";
import * as B from "lonna";
import { componentScope, h, HarmajaOutput } from "harmaja";

export const TextInput = (props: { value: B.Atom<string> } & any) => {
    return <input {...{
        type: props.type || "text" ,
        onInput: e => {
            props.value.set(e.currentTarget.value)
        },
        ...props,
        value: props.value
    }} />
};

export const TextArea = (props: { value: B.Atom<string> } & any) => {
    return <textarea {...{
        onInput: e => {
            props.value.set(e.currentTarget.value)
        },
        ...props,
        value: props.value
    }} />
};

export const Checkbox = (props: { checked: B.Atom<boolean> }) => {
    return <a 
        className={props.checked.pipe(B.map((c: boolean) => c ? "checkbox checked" : "checkbox"))} 
        onClick={ () => props.checked.modify((c: boolean) => !c)}
    />    
};  

export const EditableSpan = ( props : { value: B.Atom<string>, editingThis: B.Atom<boolean>, commit?: () => void, cancel?: () => void } & JSX.DetailedHTMLProps<JSX.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>) => {
    let { value, editingThis, commit, cancel, ...rest } = props
    const nameElement = B.atom<HTMLSpanElement | null>(null)
    let settingLocally = false
    const startEditing = () => {
        editingThis.set(true)
        nameElement.get()!.focus()
    }  
    const onKeyPress = (e: JSX.KeyboardEvent) => {
        if (e.keyCode === 13){ 
            e.preventDefault(); 
            commit && commit()
        } else if (e.keyCode === 27) { // esc
           editingThis.set(false)
           cancel && cancel()
           nameElement.get()!.textContent = value.get()
        }
    }
    const onInput = (e: JSX.InputEvent<HTMLSpanElement>) => {
        settingLocally = true        
        value.set(e.currentTarget!.textContent || "")
        settingLocally = false
    }

    return <span 
        onClick={startEditing} 
        contentEditable={editingThis} 
        ref={ nameElement.set } 
        onKeyPress={onKeyPress}
        onKeyUp={onKeyPress}
        onInput={onInput}
        {...rest }
    >{props.value.pipe(B.filter(() => !settingLocally, componentScope()))}</span>
}

export const If = ({ condition, component }: { condition: B.Property<boolean>, component: () => H.HarmajaOutput}): HarmajaOutput => {
    return condition.pipe(B.map(c => c ? component() : []))
}

export const IfElse = ({ condition, ifTrue, ifFalse }: { condition: B.Property<boolean>, ifTrue: () => H.HarmajaOutput, ifFalse: () => H.HarmajaOutput}) => {
    return condition.pipe(B.map(c => c ? ifTrue() : ifFalse()))
}