import { h } from "harmaja"
import * as L from "lonna"
import { Board } from "../../../common/src/domain"

export const SaveAsTemplate = ({ board }: { board: L.Property<Board | undefined> }) => {
    const currSavedBoard = L.atom<Board | null>(null)

    function handleLocalTemplateSave() {
        const b = board.get()
        if (!b) return
        const saved = localStorage.getItem("rboard_templates")
        const templates = saved ? (JSON.parse(saved) as Record<string, Board>) : {}

        templates[b.name] = b
        localStorage.setItem("rboard_templates", JSON.stringify(templates))
        currSavedBoard.set(b)
    }

    const changed = L.combineTemplate({
        curr: currSavedBoard,
        next: board,
    }).pipe(L.map((c) => c.curr !== c.next))
    return (
        <li
            className={L.view(changed, (c) => (c ? "" : "disabled"))}
            data-test="palette-save-as-template"
            onClick={() => handleLocalTemplateSave()}
        >
            Save as template
        </li>
    )
}
