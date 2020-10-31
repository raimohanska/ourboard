import { h } from "harmaja";
import { Color, Item, newContainer, newNote, newText, Note } from "../../../common/domain";

export const PaletteView = ( { onAdd }: { onAdd: (item: Item) => void } ) => {
  return <span className="palette">
    <span>Drag to add</span>
    {
      ["yellow", "pink", "cyan", "#673ab7"].map(color =>
        <NewNote {...{ onAdd, color }} />
      )
    }
    <NewContainer {...{ onAdd }} />
    <NewText {...{onAdd}} />
  </span>
}

export const NewText = ({ onAdd, }: { onAdd: (i: Note) => void }) => {
  return <span onDragEnd={() => onAdd(newText("HELLO"))} className="text palette-item" draggable={true}>Text</span>    
}

export const NewNote = ({ color, onAdd, }: { color: Color, onAdd: (i: Note) => void }) => {
  return <span onDragEnd={() => onAdd(newNote("HELLO", color))} className="note palette-item" draggable={true} style={{background: color}}/>    
}

export const NewContainer = ({ onAdd }: { onAdd: (i: Item) => void }) => {
  return <span onDragEnd={() => onAdd(newContainer())} className="container palette-item" draggable={true}/>
}