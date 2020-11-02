import {h} from "harmaja"
import * as L from "lonna"
import {Color} from "../../../common/domain"
import { NOTE_COLORS } from "./PaletteView"

export type ContextMenu = {
  hidden: boolean
  x: number
  y: number
}

export const HIDDEN_CONTEXT_MENU = {
  hidden: true,
  x: 0,
  y: 0
}

export const ContextMenuView = ({contextMenu, setColor}:
                                  { contextMenu: L.Property<ContextMenu>, setColor: (color: Color) => void }) => {
  return (
    <div
      className={L.view(contextMenu, c => c.hidden ? "context-menu hidden" : "context-menu")}
      style={contextMenu.pipe(L.map((c: ContextMenu) => ({
        top: c.y,
        left: c.x
      })))}>
      <div className="controls">
        <div className="palette">
          {NOTE_COLORS.map(color => {
            return <span className="template note" style={{background: color}} onClick={() => setColor(color)}>
              
            </span>
          })}
        </div>
      </div>
    </div>
  )
}