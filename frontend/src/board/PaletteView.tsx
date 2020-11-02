import { h } from "harmaja";
import { Color, Item, newContainer, newNote, newText, Note } from "../../../common/domain";

export const NOTE_COLORS = ["yellow", "pink", "cyan", "#673ab7", "black", "lightgreen", "#f0350b"]

export const PaletteView = ( { onAdd }: { onAdd: (item: Item) => void } ) => {
  return <span className="palette">
    <span>Drag to add</span>
    {
      NOTE_COLORS.map(color =>
        <NewNote {...{ onAdd, color }} />
      )
    }
    <NewContainer {...{ onAdd }} />
    <NewText {...{onAdd}} />
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