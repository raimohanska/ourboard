import { h } from "harmaja";
import { Item } from "../../../common/domain";
import { NewNote } from "./NewNote"
import { NewContainer } from "./NewContainer"

export const PaletteView = ( { onAdd }: { onAdd: (item: Item) => void } ) => {
  return <span className="palette">
    <span>Drag to add</span>
    {
      ["yellow", "pink", "cyan", "#673ab7"].map(color =>
        <NewNote {...{ onAdd, color }} />
      )
    }
    <NewContainer {...{ onAdd }} />
  </span>
}