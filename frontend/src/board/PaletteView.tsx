import * as H from "harmaja";
import { componentScope, h, ListView } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { Item, PostIt } from "../../../common/domain";
import { NewPostIt } from "./NewPostIt"
import { NewContainer } from "./NewContainer"

export const PaletteView = (
  { coordinateHelper, onAdd }: 
  { coordinateHelper: BoardCoordinateHelper, onAdd: (item: Item) => void }
) => {
  return <span className="palette">
    <span>Drag to add</span>
    {
      ["yellow", "pink", "cyan", "#673ab7"].map(color =>
        <NewPostIt {...{ onAdd, color, coordinateHelper }} />
      )
    }
    <NewContainer {...{ onAdd, coordinateHelper }} />
  </span>
}