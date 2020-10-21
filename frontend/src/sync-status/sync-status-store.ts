import * as L from "lonna"
import io from "socket.io-client"

export type SyncStatus = "offline" | "sync-pending" | "up-to-date"

export function syncStatusStore(socket: typeof io.Socket, queueSize: L.Property<number>): L.Property<SyncStatus> {
    const online = L.atom(true)
    socket.on("message", () => online.set(true))
    socket.on("disconnect", () => online.set(false))

    return L.view(online, queueSize, (online, q) => {
        if (q > 0) return "sync-pending"
        return online ? "up-to-date" : "offline"
    }).pipe(L.debounce(1000, L.globalScope))
}