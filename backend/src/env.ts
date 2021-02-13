import process from "process"

export function getEnv(name: string): string {
    const value = process.env[name]
    if (!value) throw new Error("Missing ENV: " + name)
    return value
}
