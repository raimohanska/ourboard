import { h } from "harmaja";
import * as L from "lonna";
import { Board, Color, Item, newContainer, newNote, newText, Note } from "../../../common/domain";

export const NOTE_COLORS = ["yellow", "pink", "cyan", "#673ab7", "black", "lightgreen", "#f0350b"]

export const PaletteView = ( { onAdd, board }: { onAdd: (item: Item) => void, board: L.Property<Board> } ) => {
  return <span className="palette">
    <span>Drag to add</span>
    {
      NOTE_COLORS.map(color =>
        <NewNote {...{ onAdd, color }} />
      )
    }
    <NewContainer {...{ onAdd }} />
    <NewText {...{onAdd}} />
    <SaveAsTemplate board={board} />
  </span>
}

export const NewText = ({ onAdd, }: { onAdd: (i: Item) => void }) => {
  return <span data-test="palette-new-text" onDragEnd={() => onAdd(newText("HELLO"))} className="text palette-item" draggable={true}>Text</span>    
}

export const NewNote = ({ color, onAdd, }: { color: Color, onAdd: (i: Item) => void }) => {
  return <span data-test={`palette-new-note-${color}`} onDragEnd={() => onAdd(newNote("HELLO", color))} className="note palette-item" draggable={true} style={{background: color}}/>    
}

export const NewContainer = ({ onAdd }: { onAdd: (i: Item) => void }) => {
  return <span data-test="palette-new-container" onDragEnd={() => onAdd(newContainer())} className="container palette-item" draggable={true}>Area</span>
}

export const SaveAsTemplate = ({ board }: { board: L.Property<Board> }) => {
  const currSavedBoard = L.atom<Board | null>(null);

  function handleLocalTemplateSave() {
    const b = board.get()
    const saved = localStorage.getItem("rboard_templates");
    const templates = saved ? JSON.parse(saved) as Record<string, Board> : {}

    templates[b.name] = b
    localStorage.setItem("rboard_templates", JSON.stringify(templates))
    currSavedBoard.set(board.get())
  }

  const changed = L.combineTemplate({
    curr: currSavedBoard,
    next: board
  }).pipe(L.map((c: { curr: Board | null, next: Board }) => c.curr !== c.next))
  return <button 
            disabled={L.view(changed, c => !c)}
            data-test="palette-save-as-template"
            className="button palette-item"
            onClick={() => handleLocalTemplateSave()}
          >
            Save as template
          </button>
}
