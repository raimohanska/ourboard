import { componentScope } from "harmaja"
import * as L from "lonna"

export function installKeyboardShortcut(
    selector: (e: JSX.KeyboardEvent) => boolean,
    action: (e: JSX.KeyboardEvent) => void,
) {
    ;["keydown", "keyup", "keypress"].forEach((eventName) => {
        // Prevent default for all of these to prevent Backspace=Back behavior on Firefox
        L.fromEvent<JSX.KeyboardEvent>(document, eventName)
            .pipe(L.applyScope(componentScope()))
            .forEach((e) => {
                if (selector(e)) {
                    e.preventDefault()
                    if (eventName === "keydown") {
                        action(e)
                    }
                }
            })
    })
}

export const plainKey = (...k: string[]) => (event: JSX.KeyboardEvent) => {
    return !(event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) && k.includes(event.key)
}

export const controlKey = (...k: string[]) => (event: JSX.KeyboardEvent) => {
    return (event.metaKey || event.ctrlKey) && k.includes(event.key)
}
