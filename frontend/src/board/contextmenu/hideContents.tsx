import { h } from "harmaja"
import * as L from "lonna"
import { Board, Container, isContainer, Item } from "../../../../common/src/domain"
import { canChangeVisibility } from "../board-permissions"
import { SubmenuProps } from "./ContextMenuView"
import { getIfSame } from "./textAlignments"
import { VisibilityIcon, VisibilityOffIcon } from "../../components/Icons"

export function hideContentsMenu({ board, focusedItems, dispatch }: SubmenuProps) {
    const containers = L.view(focusedItems, (items) => items.items.filter(isContainer))

    const containersOrContained = L.view(focusedItems, (items) =>
        items.items.filter((i) => isContainer(i) || !!i.containerId),
    )
    const hasContainers = L.view(containersOrContained, (cs) => cs.length > 0)
    const enabled = L.view(containersOrContained, (items) => items.some(canChangeVisibility))

    const className = enabled.pipe(L.map((e) => (e ? "icon" : "icon disabled")))
    const currentlyHidden = L.view(containers, (items) => {
        return getIfSame(items, (item) => item.contentsHidden ?? false, false)
    })

    return L.view(hasContainers, currentlyHidden, (all, hidden) => {
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
                                  items: findContainers(focusedItems.get().items, board.get()).map((c) => ({
                                      id: c.id,
                                      contentsHidden: !hidden,
                                  })),
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

function findContainers(items: Item[], board: Board): Item[] {
    const containers = items.filter(isContainer)
    const leftOverItems = items.filter((i) => !isContainer(i) && !containers.some((c) => c.id === i.containerId))
    const containersForLeftOverItems = leftOverItems
        .map((i) => board.items[i.containerId ?? ""])
        .filter((i) => i && !containers.some((c) => c.id === i.id))
    return [...containers, ...containersForLeftOverItems]
}
