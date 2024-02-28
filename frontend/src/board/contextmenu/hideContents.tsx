import { h } from "harmaja"
import * as L from "lonna"
import { isContainer } from "../../../../common/src/domain"
import { canChangeVisibility } from "../board-permissions"
import { SubmenuProps } from "./ContextMenuView"
import { getIfSame } from "./textAlignments"
import { VisibilityIcon, VisibilityOffIcon } from "../../components/Icons"

export function hideContentsMenu({ board, focusedItems, dispatch }: SubmenuProps) {
    const containers = L.view(focusedItems, (items) => items.items.filter(isContainer))
    const allContainers = L.view(focusedItems, containers, (f, t) => f.items.length > 0 && t.length === f.items.length)
    const enabled = L.view(containers, (items) => items.some(canChangeVisibility))

    const className = enabled.pipe(L.map((e) => (e ? "icon" : "icon disabled")))
    const currentlyHidden = L.view(containers, (items) => {
        return getIfSame(items, (item) => item.contentsHidden ?? false, true)
    })

    return L.view(allContainers, currentlyHidden, (all, hidden) => {
        return !all
            ? []
            : [
                  <div className="icon-group visibility">
                      <span
                          className={className}
                          onClick={() => {
                              dispatch({
                                  action: "item.update",
                                  boardId: board.get().id,
                                  items: containers.get().map((c) => ({ id: c.id, contentsHidden: !hidden })),
                              })
                          }}
                          title={hidden ? "Show contents" : "Hide contents"}
                      >
                          {hidden ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </span>
                  </div>,
              ]
    })
}
