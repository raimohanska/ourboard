export const ROOT_URL = process.env.ROOT_URL ?? "http://localhost:1337"
export const ROOT_HOST = new URL(ROOT_URL).host
export const ROOT_PROTOCOL = new URL(ROOT_URL).protocol
export const WS_HOST_LOCAL = (process.env.WS_HOST_LOCAL ?? ROOT_HOST).split(",")
export const WS_HOST_DEFAULT = process.env.WS_HOST_DEFAULT ?? ROOT_HOST
export const WS_PROTOCOL = process.env.WS_PROTOCOL ?? (ROOT_PROTOCOL.startsWith("https") ? "wss" : "ws")
