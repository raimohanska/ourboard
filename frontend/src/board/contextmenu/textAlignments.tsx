import { HarmajaOutput, h } from "harmaja"
import * as L from "lonna"
import {
    Align,
    Color,
    HorizontalAlign,
    Item,
    TextItem,
    VerticalAlign,
    getAlign,
    getHorizontalAlign,
    getVerticalAlign,
    isTextItem,
    setHorizontalAlign,
    setVerticalAlign,
} from "../../../../common/src/domain"
import {
    TextAlignHorizontalCenterIcon,
    TextAlignHorizontalLeftIcon,
    TextAlignHorizontalRightIcon,
    TextAlignVerticalBottomIcon,
    TextAlignVerticalMiddleIcon,
    TextAlignVerticalTopIcon,
} from "../../components/Icons"
import { black } from "../../components/UIColors"
import { SubmenuProps } from "./ContextMenuView"

export function textAlignmentsMenu({ board, focusedItems, dispatch, submenu }: SubmenuProps) {
    const textItems = L.view(focusedItems, (items) => items.items.filter(isTextItem))
    const allText = L.view(focusedItems, textItems, (f, t) => f.items.length > 0 && t.length === f.items.length)

    const currentHAlign = L.view(focusedItems, (f) => {
        return getIfSame(f.items, getHorizontalAlign, "left")
    })

    const currentVAlign = L.view(focusedItems, (f) => {
        return getIfSame(f.items, getVerticalAlign, "top")
    })

    function setAlign(modifyAlign: (i: TextItem) => TextItem) {
        focusedItems.get()
        const b = board.get()
        const updated = focusedItems.get().items.map((i) => (isTextItem(i) ? modifyAlign(i) : i))
        dispatch({ action: "item.update", boardId: b.id, items: updated })
    }

    return L.view(allText, currentHAlign, currentVAlign, (all, ha, va) => {
        return !all
            ? []
            : [
                  <div className="icon-group text-align">
                      <span
                          className="icon"
                          onClick={() => {
                              const hAlign: HorizontalAlign = hAligns[(hAligns.indexOf(ha) + 1) % hAligns.length]
                              setAlign((i) => setHorizontalAlign(i, hAlign))
                          }}
                          title="Align left"
                      >
                          {horizontalIcons[ha](black)}
                      </span>
                  </div>,
                  <div className="icon-group text-align">
                      <span
                          className="icon"
                          onClick={() => {
                              const vAlign: VerticalAlign = vAligns[(vAligns.indexOf(va) + 1) % vAligns.length]
                              setAlign((i) => setVerticalAlign(i, vAlign))
                          }}
                          title="Align left"
                      >
                          {verticalIcons[va](black)}
                      </span>
                  </div>,
              ]
    })
}

const horizontalIcons: Record<HorizontalAlign, (color: Color) => HarmajaOutput> = {
    left: (color: Color) => <TextAlignHorizontalLeftIcon color={color} />,
    center: (color: Color) => <TextAlignHorizontalCenterIcon color={color} />,
    right: (color: Color) => <TextAlignHorizontalRightIcon color={color} />,
}
const verticalIcons: Record<VerticalAlign, (color: Color) => HarmajaOutput> = {
    top: (color: Color) => <TextAlignVerticalTopIcon color={color} />,
    middle: (color: Color) => <TextAlignVerticalMiddleIcon color={color} />,
    bottom: (color: Color) => <TextAlignVerticalBottomIcon color={color} />,
}
const hAligns: HorizontalAlign[] = ["left", "center", "right"]
const vAligns: VerticalAlign[] = ["top", "middle", "bottom"]

function getIfSame<A>(items: Item[], get: (item: Align) => A | null, defaultValue: A) {
    let align: A | null = null
    items.forEach((item) => {})
    for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const itemAlign = isTextItem(item) ? get(getAlign(item)) : null
        if (align != null && itemAlign !== align) {
            // If not all share the same, exit
            align = null
            break
        }
        align = itemAlign
    }
    return align ?? defaultValue
}
