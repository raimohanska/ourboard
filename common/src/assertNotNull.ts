export function assertNotNull<T>(x: T | null | undefined): T {
    if (x === null || x === undefined) throw Error("Assertion failed: " + x)
    return x
}
