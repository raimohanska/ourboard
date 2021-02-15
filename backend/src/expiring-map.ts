type Key = string | number | symbol

export function AutoExpiringMap<V extends any>(ttlSeconds: number) {
    const timers = new Map<Key, NodeJS.Timeout | undefined>()
    const data: Record<Key, V> = {}
    const listeners: ((v: Record<Key, V>) => any)[] = []
    const proxy = new Proxy(data, {
        set(target, key, value) {
            const k = key as string
            target[k] = value
            setExpiryTimer(k)
            listeners.forEach((l) => l(target))
            return true
        },
        deleteProperty(target, key) {
            const k = key as string
            const didDelete = delete target[k]
            if (!didDelete) {
                return false
            }
            listeners.forEach((l) => l(target))
            return true
        },
    })

    const setExpiryTimer = (key: string) => {
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
