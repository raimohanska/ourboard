import { h } from "harmaja"
import * as L from "lonna"
import { Board, Item, newContainer, newSimilarNote, newText, Note } from "../../../common/src/domain"
import { Dispatch } from "../store/server-connection"

export const PaletteView = ({
    latestNote,
    onAdd,
    board,
    dispatch,
}: {
    latestNote: L.Property<Note>
    onAdd: (item: Item) => void
    board: L.Property<Board>
    dispatch: Dispatch
}) => {
    return (
        <span className="palette">
            <NewNote {...{ onAdd, latestNote }} />
            <NewContainer {...{ onAdd }} />
            <NewText {...{ onAdd }} />
        </span>
    )
}

export const NewText = ({ onAdd }: { onAdd: (i: Item) => void }) => {
    return (
        <span
            data-test="palette-new-text"
            title="Drag to add new text area"
            onDragEnd={() => onAdd(newText())}
            className="text palette-item"
            draggable={true}
        >
            Text
        </span>
    )
}

export const NewNote = ({ latestNote, onAdd }: { latestNote: L.Property<Note>; onAdd: (i: Item) => void }) => {
    const color = L.view(latestNote, "color")
    return (
        <span
            data-test={L.view(color, (c) => `palette-new-note-${c}`)}
            title="Drag to add new text note"
            onDragEnd={() => onAdd(newSimilarNote(latestNote.get()))}
            className={L.view(latestNote, (n) => `note palette-item ${n.shape}`)}
            draggable={true}
            style={L.view(color, (c) => ({ background: c }))}
        />
    )
}

export const NewContainer = ({ onAdd }: { onAdd: (i: Item) => void }) => {
    return (
        <span
            data-test="palette-new-container"
            title="Drag to add new area"
            onDragEnd={() => onAdd(newContainer())}
            className="container palette-item"
            draggable={true}
        >
            Area
        </span>
    )
}
