import { h } from "harmaja"
import * as L from "lonna"
import { Board, Item, newContainer, newSimilarNote, newText, Note } from "../../../common/src/domain"
import { Dispatch } from "../store/user-session-store"

export const NOTE_COLORS = ["#81BAE7", "#A9DEB6", "#F5F18D", "#F3BF71", "#E98AA7", "black", "gray", "white"]

export const PaletteView = ({
    latestNote,
    onAdd,
    board,
    dispatch,
}: {
    latestNote: L.Atom<Note>
    onAdd: (item: Item) => void
    board: L.Property<Board>
    dispatch: Dispatch
}) => {
    return (
        <span className="palette">
            {L.view(latestNote, (latestNote) => (
                <NewNote {...{ onAdd, latestNote }} />
            ))}
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
            onDragEnd={() => onAdd(newText("HELLO"))}
            className="text palette-item"
            draggable={true}
        >
            Text
        </span>
    )
}

export const NewNote = ({ latestNote, onAdd }: { latestNote: Note; onAdd: (i: Item) => void }) => {
    return (
        <span
            data-test={`palette-new-note-${latestNote.color}`}
            title="Drag to add new text note"
            onDragEnd={() => onAdd(newSimilarNote(latestNote))}
            className="note palette-item"
            draggable={true}
            style={{ background: latestNote.color }}
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
