import { isArray, isEqual } from "lodash"

export function toArray<T>(x: T | T[]) {
    if (isArray(x)) return x
    return [x]
}

export function arrayIdMatch<T extends { id: string }>(a: T[] | T, b: T[] | T) {
    return arrayEquals(idsOf(a), idsOf(b))
}

export function arrayObjectKeysMatch<T extends object>(a: T[] | T, b: T[] | T) {
    return arrayEquals(keysOf(a), keysOf(b))
}

export function arrayIdAndKeysMatch<T extends { id: string }>(a: T[] | T, b: T[] | T) {
    return arrayIdMatch(a, b) && arrayObjectKeysMatch(a, b)
}

export function idsOf<T extends { id: string }>(a: T[] | T): string[] {
    return toArray(a).map((x) => x.id)
}

export function keysOf<T extends object>(a: T[] | T): string[][] {
    return toArray(a).map((x) => Object.keys(x))
}

export function arrayEquals<T>(a: T[] | T, b: T[] | T) {
    return isEqual(toArray(a), toArray(b))
}

export function arrayToRecordById<T extends { id: string }>(arr: T[], init: Record<string, T> = {}): Record<string, T> {
    return arr.reduce((acc: Record<string, T>, elem: T) => {
        acc[elem.id] = elem
        return acc
    }, init)
}
