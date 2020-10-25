import * as H from "harmaja";
import { componentScope, h, ListView } from "harmaja";
import * as L from "lonna";
import { BoardCoordinateHelper } from "./board-coordinates"
import { PostIt } from "../../../common/domain";
import { NewPostIt } from "./NewPostIt"

export const PaletteView = (
  { coordinateHelper, onAdd }: 
  { coordinateHelper: BoardCoordinateHelper, onAdd: (item: PostIt) => void }
) => {
  return <span className="palette">
    <span>Drag to add</span>
    {
      ["yellow", "pink", "cyan"].map(color =>
        <NewPostIt {...{ onAdd, color, coordinateHelper }} />
      )
    }
  </span>
}