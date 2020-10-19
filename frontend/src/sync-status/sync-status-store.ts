import * as B from "lonna"
import io from "socket.io-client"

export type SyncStatus = "offline" | "sync-pending" | "up-to-date"

export function syncStatusStore(socket: typeof io.Socket, queueSize: B.Property<number>): B.Property<SyncStatus> {
    const online = B.atom(false)
    socket.on("message", () => online.set(true))
    socket.on("disconnect", () => online.set(false))

    return B.combine(online, queueSize, (online, q) => {
        if (q > 0) return "sync-pending"
        return online ? "up-to-date" : "offline"
    })
}