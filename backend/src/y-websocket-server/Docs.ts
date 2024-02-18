import map from "lib0/map"
import { WSSharedDoc } from "./WSSharedDoc"
import { Persistence } from "./Persistence"

export interface DocsOptions {
    persistence?: Persistence
    gc?: boolean
}

export class Docs {
    readonly docs = new Map<string, WSSharedDoc>()
    readonly persistence: Persistence | null
    readonly gc: boolean

    constructor(options: DocsOptions = {}) {
        this.persistence = options.persistence || null
        this.gc = options.gc ?? true
    }

    /**
     * Gets a Y.Doc by name, whether in memory or on disk
     */
    getYDoc(docname: string): WSSharedDoc {
        return map.setIfUndefined(this.docs, docname, () => {
            const doc = new WSSharedDoc(this, docname)
            doc.gc = this.gc
            if (this.persistence !== null) {
                this.persistence.bindState(docname, doc)
            }
            this.docs.set(docname, doc)
            return doc
        })
    }

    deleteYDoc(doc: WSSharedDoc) {
        this.docs.delete(doc.name)
    }
}
