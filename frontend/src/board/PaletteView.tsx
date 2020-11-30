import { h } from "harmaja";
import * as L from "lonna";
import { Board, Color, Item, newContainer, newNote, newText, Note } from "../../../common/src/domain";
import { Dispatch } from "./board-store";

export const NOTE_COLORS = ["yellow", "pink", "cyan", "#673ab7", "black", "lightgreen", "#f0350b"]

export const PaletteView = ( { latestNoteColor, onAdd, board, dispatch }: { latestNoteColor: L.Atom<Color>, onAdd: (item: Item) => void, board: L.Property<Board>, dispatch: Dispatch } ) => {
  return <span className="palette">
    {
      L.view(latestNoteColor, color =>
        <NewNote {...{ onAdd, color }} />
      )
    }
    <NewContainer {...{ onAdd }} />
    <NewText {...{onAdd}} />
    <span className="icon undo" onClick={() => dispatch({ action: "undo" })} />
    <span className="icon redo" onClick={() => dispatch({ action: "redo" })} />
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
