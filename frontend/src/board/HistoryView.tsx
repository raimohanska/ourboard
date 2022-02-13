import { componentScope, Fragment, h, ListView } from "harmaja"
import * as L from "lonna"
import prettyMs from "pretty-ms"
import { idsOf, toArray } from "../../../common/src/arrays"
import { boardReducer } from "../../../common/src/board-reducer"
import {
    Board,
    BoardHistoryEntry,
    EventUserInfo,
    findItem,
    getItem,
    getItemIds,
    getItemText,
    Id,
    ISOTimeStamp,
    Item,
    PersistableBoardItemEvent,
} from "../../../common/src/domain"
import { Checkbox } from "../components/components"
import { HistoryIcon } from "../components/Icons"
import { Dispatch } from "../store/board-store"
import { BoardFocus, getSelectedItemIds, noFocus } from "./board-focus"

type ParsedHistoryEntry = {
    timestamp: ISOTimeStamp
    itemIds: Id[]
    user: EventUserInfo
    kind: "added" | "moved into" | "renamed" | "deleted" | "changed"
    actionText: string // TODO: this should include links to items for selecting by click.
    revertAction?: PersistableBoardItemEvent
}

export const HistoryView = ({
    history,
    board,
    focus,
    dispatch,
}: {
    history: L.Property<BoardHistoryEntry[]>
    board: L.Property<Board>
    focus: L.Property<BoardFocus>
    dispatch: Dispatch
}) => {
    const expanded = L.atom(false)

    return (
        <div className={L.view(expanded, (e) => (e ? "history expanded" : "history"))}>
            <div className="history-icon-wrapper">
                <span className="icon" onClick={() => expanded.modify((e) => !e)}>
                    <HistoryIcon />
                </span>
            </div>
            {L.view(expanded, (e) => e && <HistoryTable />)}
        </div>
    )

    function HistoryTable() {
        // Note: parsing full history once a second may or may not prove to be a performance challenge.
        // At least it's done only when the history table is visible and debounced with 1000 milliseconds.
        const parsedHistory = history.pipe(L.debounce(1000, componentScope()), L.map(parseFullHistory))
        const forSelectedItem = L.atom(false)
        const historyFocus = L.view(focus, forSelectedItem, (f, s) => (s ? f : noFocus))
        const focusedHistory = L.combine(parsedHistory, historyFocus, focusHistory)
        const clippedHistory = L.view(focusedHistory, clipHistory)

        return (
            <>
                <h2>Change Log</h2>
                <div className="selection">
                    <Checkbox checked={forSelectedItem} /> for selected items
                </div>
                <div className="scroll-container">
                    <table>
                        <ListView
                            observable={clippedHistory}
                            getKey={(i) => i.timestamp}
                            renderObservable={renderHistoryEntry}
                        />
                    </table>
                </div>
            </>
        )
    }

    function renderHistoryEntry(key: string, entry: L.Property<ParsedHistoryEntry>) {
        return (
            <tr className="row">
                <td className="timestamp">{L.view(entry, (e) => renderTimestamp(e.timestamp))}</td>
                <td className="action">{L.view(entry, (e) => `${e.user.nickname} ${e.actionText}`)}</td>
                <td className="revert">
                    {L.view(entry, (e) =>
                        e.revertAction ? (
                            <a className="icon undo" title="Revert" onClick={() => dispatch(e.revertAction!)}></a>
                        ) : null,
                    )}
                </td>
            </tr>
        )
    }

    function renderTimestamp(timestamp: ISOTimeStamp) {
        const diff = new Date().getTime() - new Date(timestamp).getTime()
        if (diff < 1000) return "just now"
        return prettyMs(diff, { compact: true }) + " ago"
    }

    function focusHistory(history: ParsedHistoryEntry[], focus: BoardFocus) {
        const selectedIds = getSelectedItemIds(focus)
        if (selectedIds.size === 0) {
            return history
        }
        return history.filter((entry) => entry.itemIds.some((id) => selectedIds.has(id)))
    }

    function clipHistory(history: ParsedHistoryEntry[]) {
        return history.reverse().slice(0, 100)
    }

    function parseFullHistory(history: BoardHistoryEntry[]): ParsedHistoryEntry[] {
        // Note: the history is not necessarily full, just what we have available locally. It will always start with a bootstrapping
        // action though, so it will be consistent.
        const currentBoard = board.get()
        const initAtSerial = (history[0]?.serial || 1) - 1
        const init = {
            board: { ...currentBoard, items: {}, serial: initAtSerial } as Board,
            parsedHistory: [] as ParsedHistoryEntry[],
        }
        const { parsedHistory } = history.reduce(({ board, parsedHistory }, event) => {
            const [boardAfter, revertAction] = boardReducer(board, event)
            let parsedEntry = parseHistory(event, board, boardAfter)
            if (
                parsedEntry &&
                revertAction &&
                event.action === "item.delete" &&
                !event.itemIds.some((id) => !!findItem(currentBoard)(id))
            )
                parsedEntry = { ...parsedEntry, revertAction }
            const newHistory = parsedEntry !== null ? [...parsedHistory, parsedEntry] : parsedHistory
            return { board: boardAfter, parsedHistory: newHistory, revertAction }
        }, init)
        return parsedHistory
    }

    function parseHistory(event: BoardHistoryEntry, boardBefore: Board, boardAfter: Board): ParsedHistoryEntry | null {
        const { timestamp, user } = event
        const itemIds = getItemIds(event)
        switch (event.action) {
            case "connection.add":
                return {
                    timestamp,
                    user,
                    itemIds: idsOf(event.connections),
                    kind: "added",
                    actionText: `added connection ${idsOf(event.connections).join(", ")}`,
                }
            case "connection.delete":
                return {
                    timestamp,
                    user,
                    itemIds: event.connectionIds,
                    kind: "deleted",
                    actionText: `deleted connection ${event.connectionIds.join(", ")}`,
                }

            case "connection.modify": {
                return {
                    timestamp,
                    user,
                    itemIds: idsOf(event.connections),
                    kind: "changed",
                    actionText: `changed connection ${idsOf(event.connections).join(", ")}`,
                }
            }
            case "item.add": {
                const containerIds = [...new Set(event.items.map((i) => i.containerId))]
                const containerInfo =
                    (containerIds.length === 1 &&
                        containerIds[0] &&
                        ` to ${describeItems([getItem(boardBefore)(containerIds[0])])}`) ||
                    ""
                return {
                    timestamp,
                    user,
                    itemIds,
                    kind: "added",
                    actionText: `added ${describeItems(event.items)}${containerInfo}`,
                }
            }
            case "item.delete":
                return {
                    timestamp,
                    user,
                    itemIds,
                    kind: "deleted",
                    actionText: "deleted " + describeItems(itemIds.map(getItem(boardBefore))),
                }
            case "item.font.decrease":
            case "item.font.increase":
            case "item.front":
                return null
            case "item.move": {
                const containerChanged = event.items.some(
                    (i) => i.containerId !== getItem(boardBefore)(i.id).containerId,
                )
                const containerIds = event.items.map((i) => i.containerId)
                const containerId = containerIds[0]
                const sameContainer = new Set(containerIds).size === 1
                if (containerId && containerChanged && sameContainer) {
                    return {
                        timestamp,
                        user,
                        itemIds,
                        kind: "moved into",
                        actionText: `moved ${describeItems(itemIds.map(getItem(boardBefore)))} to ${describeItems([
                            getItem(boardBefore)(containerId),
                        ])}`,
                    }
                } else {
                    return null
                }
            }
            case "item.update": {
                if (event.items.length === 1) {
                    const itemId = event.items[0].id
                    const itemBefore = getItem(boardBefore)(itemId)
                    const itemAfter = getItem(boardAfter)(itemId)
                    const textBefore = getItemText(itemBefore)
                    const textAfter = getItemText(itemAfter)
                    if (textBefore !== textAfter) {
                        return {
                            timestamp,
                            user,
                            itemIds,
                            kind: "renamed",
                            actionText: `renamed ${describeItems([itemBefore])} to ${textAfter}`,
                        }
                    } else {
                        return null // Ignore all the resizes, recolorings...
                    }
                }
                return {
                    timestamp,
                    user,
                    itemIds,
                    kind: "changed",
                    actionText: `changed ${describeItems(event.items)}`,
                }
            }
            case "board.rename":
            case "board.setAccessPolicy":
            case "item.bootstrap": {
                return null
            }
        }
    }

    function describeItems(items: Item[]): string | null {
        if (items.length === 0) return null
        if (items.length > 1) return "multiple items"
        const item = items[0]
        switch (item.type) {
            case "note":
            case "container":
            case "text":
                return item.text
            case "image":
                return "an image"
            case "video":
                return "a video"
        }
    }
}
