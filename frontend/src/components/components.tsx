import * as H from "harmaja"
import * as L from "lonna"
import { componentScope, h, HarmajaOutput } from "harmaja"

export const TextInput = (props: { value: L.Atom<string> } & any) => {
    return (
        <input
            {...{
                type: props.type || "text",
                onInput: (e) => {
                    props.value.set(e.currentTarget.value)
                },
                ...props,
                value: props.value,
            }}
        />
    )
}

export const TextArea = (props: { value: L.Atom<string> } & any) => {
    return (
        <textarea
            {...{
                onInput: (e) => {
                    props.value.set(e.currentTarget.value)
                },
                ...props,
                value: props.value,
            }}
        />
    )
}

export const Checkbox = (props: { checked: L.Atom<boolean> }) => {
    return (
        <a
            className={props.checked.pipe(L.map((c) => (c ? "checkbox checked" : "checkbox")))}
            onClick={(e) => {
                props.checked.modify((c: boolean) => !c)
                e.stopPropagation()
            }}
        />
    )
}
