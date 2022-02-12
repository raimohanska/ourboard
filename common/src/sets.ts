export function toggleInSet<T>(item: T, set: Set<T>) {
    if (set.has(item)) {
        return new Set([...set].filter((i) => i !== item))
    }
    return new Set([...set].concat(item))
}

export function difference<A>(setA: Set<A>, setB: Set<A>) {
    let _difference = new Set(setA)
    for (let elem of setB) {
        _difference.delete(elem)
    }
    return _difference
}

export const emptySet = <A>() => new Set<A>()
