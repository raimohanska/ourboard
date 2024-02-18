declare module "y-protocols/dist/sync.cjs" {
    export function writeSyncStep1(encoder: any, doc: Y.Doc): void
    export function readSyncMessage(decoder: any, encoder: any, doc: Y.Doc, conn: any): void
    export function writeUpdate(encoder: any, update: Uint8Array): void
}

declare module "y-protocols/dist/awareness.cjs" {
    export function applyAwarenessUpdate(awareness: any, update: Uint8Array, origin: any): void
    export function encodeAwarenessUpdate(awareness: any, changedClients: number[]): Uint8Array
    export function removeAwarenessStates(awareness: any, clients: number[], origin: any): void
    export class Awareness {
        constructor(doc: any)
        getLocalState(): Uint8Array
        setLocalState(state: Uint8Array | null): void
        on(event: string, f: Function): void
        off(event: string, f: Function): void
        setAllStates(states: Map<any, any>): void
        getStates(): Map<any, any>
        destroy(): void
    }
}
