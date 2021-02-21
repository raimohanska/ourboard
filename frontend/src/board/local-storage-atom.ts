import * as L from "lonna"

export function localStorageAtom<T>(key: string, defaultValue: T) {
    const initialValue = localStorage[key] !== undefined ? JSON.parse(localStorage[key]) : defaultValue
    const atom = L.atom<T>(initialValue)
    atom.onChange((v) => (localStorage[key] = JSON.stringify(v)))
    return atom
}
