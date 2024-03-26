import { h } from "harmaja"
import * as L from "lonna"
import { isContainer } from "../../../../common/src/domain"
import { VisibilityIcon, VisibilityOffIcon } from "../../components/Icons"
import { canChangeVisibility } from "../board-permissions"
import { hasContentHidden, toggleContentsHidden } from "../item-hide-contents"
import { SubmenuProps } from "./ContextMenuView"

export function hideContentsMenu({ board, focusedItems, dispatch }: SubmenuProps) {
    const containers = L.view(focusedItems, (items) => items.items.filter(isContainer))

    const containersOrContained = L.view(focusedItems, (items) =>
        items.items.filter((i) => isContainer(i) || !!i.containerId),
    )
    const hasContainers = L.view(containersOrContained, (cs) => cs.length > 0)
    const enabled = L.view(containersOrContained, (items) => items.some(canChangeVisibility))

    const className = enabled.pipe(L.map((e) => (e ? "icon" : "icon disabled")))
    const currentlyHidden = L.view(containers, hasContentHidden)

    return L.view(hasContainers, currentlyHidden, (hasContainers, hidden) => {
        return !hasContainers
            ? []
            : [
                  <div className="icon-group visibility">
                      <span
                          className={className}
                          onClick={() => {
                              toggleContentsHidden(focusedItems.get().items, board.get(), dispatch)
                          }}
                          title={hidden ? "Show contents" : "Hide contents"}
                      >
                          {hidden ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </span>
                  </div>,
              ]
    })
}
