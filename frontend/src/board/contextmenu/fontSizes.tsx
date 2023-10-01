import { HarmajaOutput, componentScope, h } from "harmaja"
import * as L from "lonna"
import { isTextItem } from "../../../../common/src/domain"
import { DecreaseFontSizeIcon, IncreaseFontSizeIcon } from "../../components/Icons"
import { SubmenuProps } from "./ContextMenuView"
import { black, disabledColor } from "../../components/UIColors"

type MenuIconProps = {
    onClick: () => void
    title: string
    icon: HarmajaOutput
    enabled: L.Property<boolean>
}
export const MenuIcon = (props: MenuIconProps) => {
    return (
        <span
            className="icon"
            style={props.enabled.pipe(L.map((e) => ({ color: e ? black : disabledColor })))}
            onClick={L.view(props.enabled, (e) => (e ? props.onClick : undefined))}
            title={props.title}
        >
            {props.icon}
        </span>
    )
}

export function fontSizesMenu({ board, focusedItems, dispatch, permissions }: SubmenuProps) {
    const textItems = L.view(focusedItems, (items) => items.items.filter(isTextItem))
    const anyText = L.view(textItems, (items) => items.length > 0)
    const enabled = permissions.everyItemHasPermission(textItems, (p) => p.canChangeFont, componentScope())
    const className = enabled.pipe(L.map((e) => (e ? "icon" : "icon disabled")))

    return L.view(anyText, (any) =>
        !any
            ? []
            : [
                  <div className="font-size icon-group">
                      <span className={className} onClick={increaseFont} title="Bigger font">
                          <IncreaseFontSizeIcon />
                      </span>
                      <span className={className} onClick={decreaseFont} title="Smaller font">
                          <DecreaseFontSizeIcon />
                      </span>
                  </div>,
              ],
    )

    function increaseFont() {
        if (!enabled.get()) return
        dispatch({
            action: "item.font.increase",
            boardId: board.get().id,
            itemIds: textItems.get().map((i) => i.id),
        })
    }
    function decreaseFont() {
        if (!enabled.get()) return
        dispatch({
            action: "item.font.decrease",
            boardId: board.get().id,
            itemIds: textItems.get().map((i) => i.id),
        })
    }
}
