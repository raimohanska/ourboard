import { HarmajaOutput, h } from "harmaja"
import * as L from "lonna"
import {
    Color,
    HorizontalAlign,
    Item,
    getHorizontalAlign,
    isTextItem,
    setHorizontalAlign,
} from "../../../../common/src/domain"
import {
    TextAlignHorizontalCenterIcon,
    TextAlignHorizontalLeftIcon,
    TextAlignHorizontalRightIcon,
} from "../../components/Icons"
import { black } from "../../components/UIColors"
import { SubmenuProps } from "./ContextMenuView"

export function textAlignmentsMenu({ board, focusedItems, dispatch, submenu }: SubmenuProps) {
    const textItems = L.view(focusedItems, (items) => items.items.filter(isTextItem))
    const allText = L.view(focusedItems, textItems, (f, t) => f.items.length > 0 && t.length === f.items.length)

    const currentAlign = L.view(focusedItems, (f) => {
        const items = f.items
        const align = getHA(items[0])
        for (let i = 1; i < items.length; i++) {
            if (getHA(items[i]) !== align) {
                return null // If not all share the same, return null
            }
        }
        return align
    })

    function setAlign(align: HorizontalAlign) {
        focusedItems.get()
        const b = board.get()
        const updated = focusedItems.get().items.map((i) => (isTextItem(i) ? setHorizontalAlign(i, align) : i))
        dispatch({ action: "item.update", boardId: b.id, items: updated })
    }

    return L.view(allText, currentAlign, (all, ca) => {
        return !all
            ? []
            : [
                  <div className="icon-group text-align">
                      <span
                          className="icon"
                          onClick={() => setAlign(aligns[(aligns.indexOf(ca ?? "left") + 1) % aligns.length])}
                          title="Align left"
                      >
                          {icons[ca ?? "left"](black)}
                      </span>
                  </div>,
              ]
    })
}

function getHA(item: Item | null) {
    return item && isTextItem(item) ? getHorizontalAlign(item) : null
}

const icons: Record<HorizontalAlign, (color: Color) => HarmajaOutput> = {
    left: (color: Color) => <TextAlignHorizontalLeftIcon color={color} />,
    center: (color: Color) => <TextAlignHorizontalCenterIcon color={color} />,
    right: (color: Color) => <TextAlignHorizontalRightIcon color={color} />,
}
const aligns: HorizontalAlign[] = ["left", "center", "right"]
