export function AutoExpiringMap<V extends any>(ttlSeconds: number) {
    const timers = new Map<string | number, NodeJS.Timeout | undefined>()
    const data: Record<string, V> = {}
    const listeners: ((v: Record<string, V>) => any)[] = []
    const proxy = new Proxy(data, {
        set(target, key, value) {
            if (typeof key === "symbol") return false
            target[key] = value
            setExpiryTimer(key)
            listeners.forEach((l) => l(target))
            return true
        },
        deleteProperty(target, key) {
            if (typeof key === "symbol") return false
            const didDelete = delete target[key]
            if (!didDelete) {
                return false
            }
            listeners.forEach((l) => l(target))
            return true
        },
    })

    const setExpiryTimer = (key: string | number) => {
        if (timers.has(key)) {
            clearTimeout(timers.get(key)!)
        }

        timers.set(
            key,
            setTimeout(() => {
                timers.delete(key)
                delete proxy[key]
            }, ttlSeconds * 1000),
        )
    }

    const autoExpiringMap = {
        get: (key: string) => proxy[key],
        has: (key: string) => !!proxy[key],
        entries: () => Object.entries(proxy),
        delete: (key: string) => delete proxy[key],
        set: (key: string, value: any) => {
            proxy[key] = value
        },
        onChange: (fn: (v: Record<string, V>) => any) => {
            listeners.push(fn)
            return autoExpiringMap
        },
    }

    return autoExpiringMap
}
