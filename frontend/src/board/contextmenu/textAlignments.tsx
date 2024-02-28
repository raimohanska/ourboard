import { HarmajaOutput, componentScope, h } from "harmaja"
import * as L from "lonna"
import {
    Align,
    Color,
    HorizontalAlign,
    Item,
    ItemUpdate,
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
import { black, disabledColor } from "../../components/UIColors"
import { SubmenuProps } from "./ContextMenuView"
import { canChangeTextAlign } from "../board-permissions"

export function textAlignmentsMenu({ board, focusedItems, dispatch }: SubmenuProps) {
    const textItems = L.view(focusedItems, (items) => items.items.filter(isTextItem))
    const allText = L.view(focusedItems, textItems, (f, t) => f.items.length > 0 && t.length === f.items.length)

    const currentHAlign = L.view(focusedItems, (f) => {
        return getIfSame(f.items, (item) => (isTextItem(item) ? getHorizontalAlign(getAlign(item)) : null), "left")
    })

    const currentVAlign = L.view(focusedItems, (f) => {
        return getIfSame(f.items, (item) => (isTextItem(item) ? getVerticalAlign(getAlign(item)) : null), "top")
    })

    function setAlign(modifyAlign: (i: TextItem) => ItemUpdate<TextItem>) {
        focusedItems.get()
        const b = board.get()
        const updated = focusedItems
            .get()
            .items.filter(isTextItem)
            .map((i) => modifyAlign(i))
        dispatch({ action: "item.update", boardId: b.id, items: updated })
    }

    const enabled = L.view(textItems, (items) => items.some(canChangeTextAlign))

    const className = enabled.pipe(L.map((e) => (e ? "icon" : "icon disabled")))

    return L.view(allText, currentHAlign, currentVAlign, (all, ha, va) => {
        return !all
            ? []
            : [
                  <div className="icon-group text-align">
                      <span
                          className={className}
                          onClick={() => {
                              const hAlign: HorizontalAlign = hAligns[(hAligns.indexOf(ha) + 1) % hAligns.length]
                              setAlign((i) => setHorizontalAlign(i, hAlign))
                          }}
                          title="Horizontal align"
                      >
                          {enabled.pipe(L.map((e) => horizontalIcons[ha](e ? black : disabledColor)))}
                      </span>
                  </div>,
                  <div className="icon-group text-align">
                      <span
                          className={className}
                          onClick={() => {
                              const vAlign: VerticalAlign = vAligns[(vAligns.indexOf(va) + 1) % vAligns.length]
                              setAlign((i) => setVerticalAlign(i, vAlign))
                          }}
                          title="Vertical align"
                      >
                          {enabled.pipe(L.map((e) => verticalIcons[va](e ? black : disabledColor)))}
                      </span>
                  </div>,
              ]
    })
}

const horizontalIcons: Record<HorizontalAlign, (color: Color) => HarmajaOutput> = {
    left: () => <TextAlignHorizontalLeftIcon />,
    center: () => <TextAlignHorizontalCenterIcon />,
    right: () => <TextAlignHorizontalRightIcon />,
}
const verticalIcons: Record<VerticalAlign, (color: Color) => HarmajaOutput> = {
    top: () => <TextAlignVerticalTopIcon />,
    middle: () => <TextAlignVerticalMiddleIcon />,
    bottom: () => <TextAlignVerticalBottomIcon />,
}
const hAligns: HorizontalAlign[] = ["left", "center", "right"]
const vAligns: VerticalAlign[] = ["top", "middle", "bottom"]

export function getIfSame<I, P>(items: I[], get: (item: I) => P | null, defaultValue: P) {
    let align: P | null = null
    items.forEach((item) => {})
    for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const itemAlign = get(item)
        if (align != null && itemAlign !== align) {
            // If not all share the same, exit
            align = null
            break
        }
        align = itemAlign
    }
    return align ?? defaultValue
}
