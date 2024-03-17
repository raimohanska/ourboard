import { h } from "harmaja"
import * as L from "lonna"
import { CrdtEnabled, isTextItem } from "../../../../common/src/domain"
import { BoldIcon, ItalicIcon, UnderlineIcon } from "../../components/Icons"
import { canChangeTextFormat } from "../board-permissions"
import { SubmenuProps } from "./ContextMenuView"

export function textFormatsMenu({ board, focusedItems, dispatch }: SubmenuProps) {
    const textItems = L.view(focusedItems, (items) =>
        items.items.filter((i) => isTextItem(i) && i.crdt === CrdtEnabled),
    )
    const singleText = L.view(focusedItems, textItems, (f, t) => f.items.length === 1 && t.length === f.items.length)

    const enabled = L.view(textItems, (items) => items.some(canChangeTextFormat))

    const className = enabled.pipe(L.map((e) => (e ? "icon" : "icon disabled")))

    return L.view(singleText, (singleText) => {
        return !singleText
            ? []
            : [
                  <div className="icon-group text-format">
                      <span
                          className={className}
                          onClick={() => {
                              dispatch({
                                  action: "ui.text.format",
                                  itemIds: textItems.get().map((i) => i.id),
                                  format: "bold",
                              })
                          }}
                          title="Bold"
                      >
                          <BoldIcon />
                      </span>
                      <span
                          className={className}
                          onClick={() => {
                              dispatch({
                                  action: "ui.text.format",
                                  itemIds: textItems.get().map((i) => i.id),
                                  format: "italic",
                              })
                          }}
                          title="Italic"
                      >
                          <ItalicIcon />
                      </span>
                      <span
                          className={className}
                          onClick={() => {
                              dispatch({
                                  action: "ui.text.format",
                                  itemIds: textItems.get().map((i) => i.id),
                                  format: "underline",
                              })
                          }}
                          title="Underline"
                      >
                          <UnderlineIcon />
                      </span>
                  </div>,
                  ,
              ]
    })
}
