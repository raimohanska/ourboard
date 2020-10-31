import { h } from "harmaja";
import { Color, newNote, Note } from "../../../common/domain";

export const NewNote = ({ color, onAdd, }: { color: Color, onAdd: (i: Note) => void }) => {
  return <span onDragEnd={() => onAdd(newNote("HELLO", color))} className="note palette-item" draggable={true} style={{background: color}}/>    
}