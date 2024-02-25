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
        let doc = this.docs.get(docname)
        if (!doc) {
            doc = new WSSharedDoc(this, docname)
            console.log(`Loading document ${doc.name} into memory`)
            doc.gc = this.gc
            if (this.persistence !== null) {
                void this.persistence.bindState(docname, doc)
            }
            this.docs.set(docname, doc)
        }
        return doc
    }

    deleteYDoc(doc: WSSharedDoc) {
        console.log(`Purging document ${doc.name} from memory`)
        this.docs.delete(doc.name)
    }
}
