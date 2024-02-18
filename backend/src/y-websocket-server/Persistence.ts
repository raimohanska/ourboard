import * as Y from "yjs"

export interface Persistence {
    bindState: (docName: string, ydoc: Y.Doc) => void
    writeState: (docName: string, ydoc: Y.Doc) => Promise<any>
    provider: any
}

export function createLevelDbPersistence(persistenceDir: string): Persistence {
    console.info('Persisting documents to "' + persistenceDir + '"')
    // @ts-ignore
    const LeveldbPersistence = require("y-leveldb").LeveldbPersistence
    const ldb = new LeveldbPersistence(persistenceDir)
    return {
        provider: ldb,
        bindState: async (docName, ydoc) => {
            const persistedYdoc = await ldb.getYDoc(docName)
            const newUpdates = Y.encodeStateAsUpdate(ydoc)
            ldb.storeUpdate(docName, newUpdates)
            Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persistedYdoc))
            ydoc.on("update", (update) => {
                ldb.storeUpdate(docName, update)
            })
        },
        writeState: async (docName, ydoc) => {},
    }
}
