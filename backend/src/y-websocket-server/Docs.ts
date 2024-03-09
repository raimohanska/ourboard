import { WSSharedDoc } from "./WSSharedDoc"
import { Persistence } from "./Persistence"

export interface DocsOptions {
    persistence?: Persistence
    gc?: boolean
}

interface DocState {
    doc: WSSharedDoc
    fetchPromise: Promise<void>
}

export class Docs {
    readonly docs = new Map<string, DocState>()
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
        return this.getDocState(docname).doc
    }

    async getYDocAndWaitForFetch(docname: string): Promise<WSSharedDoc> {
        const state = this.getDocState(docname)
        await state.fetchPromise
        return state.doc
    }

    private getDocState(docname: string): DocState {
        let state = this.docs.get(docname)
        if (!state) {
            const doc = new WSSharedDoc(this, docname)
            console.log(`Loading document ${doc.name} into memory`)
            doc.gc = this.gc
            if (this.persistence !== null) {
                void this.persistence.bindState(docname, doc)
            }
            const fetchPromise =
                this.persistence !== null ? this.persistence.bindState(docname, doc) : Promise.resolve()
            state = { doc, fetchPromise }
            this.docs.set(docname, state)
        }
        return state
    }

    deleteYDoc(doc: WSSharedDoc) {
        console.log(`Purging document ${doc.name} from memory`)
        this.docs.delete(doc.name)
    }
}
