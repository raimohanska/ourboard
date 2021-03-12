import _, { isUndefined } from "lodash"
import * as uuid from "uuid"
import * as t from "io-ts"

export type Id = string
export type ISOTimeStamp = string

export type BoardAttributes = {
    id: Id
    name: string
    width: number
    height: number
    accessPolicy?: BoardAccessPolicy
}

export type Board = BoardAttributes & {
    items: Item[]
    serial: Serial
}

export const BoardAccessPolicyCodec = t.union([
    t.undefined,
    t.type({
        allowList: t.array(
            t.union([
                t.type({
                    email: t.string,
                }),
                t.type({
                    domain: t.string,
                }),
            ]),
        ),
    }),
])
export type BoardAccessPolicy = t.TypeOf<typeof BoardAccessPolicyCodec>

export type AuthorizedParty = AuthorizedByEmailAddress | AuthorizedByDomain
export type AuthorizedByEmailAddress = { email: string }
export type AuthorizedByDomain = { domain: string }

export type BoardStub = Pick<Board, "id" | "name">

export type EventUserInfo =
    | { nickname: string; userType: "unidentified" }
    | { nickname: string; userType: "system" }
    | EventUserInfoAuthenticated

export type EventUserInfoAuthenticated = {
    nickname: string
    userType: "authenticated"
    name: string
    email: string
    userId: string
}

export type UserSessionInfo = EventUserInfo & {
    sessionId: Id
}

export type BoardHistoryEntry = {
    user: EventUserInfo
    timestamp: ISOTimeStamp
    serial?: Serial
} & PersistableBoardItemEvent
export type BoardWithHistory = { board: Board; history: BoardHistoryEntry[] }
export type CompactBoardHistory = { boardAttributes: BoardAttributes; history: BoardHistoryEntry[] }

export function isFullyFormedBoard(b: Board | BoardStub): b is Board {
    return !!b.id && !!b.name && ["width", "height", "items"].every((prop) => prop in b)
}

export const defaultBoardSize = { width: 800, height: 600 }

export interface CursorPosition {
    x: number
    y: number
}

export type UserCursorPosition = CursorPosition & {
    sessionId: Id
}

export type BoardCursorPositions = Record<Id, UserCursorPosition>

export type Color = string

export type ItemBounds = { x: number; y: number; width: number; height: number; z: number }
export type ItemProperties = { id: string; containerId?: string } & ItemBounds

export const ITEM_TYPES = {
    NOTE: "note",
    TEXT: "text",
    IMAGE: "image",
    CONTAINER: "container",
} as const
export type ItemType = typeof ITEM_TYPES[keyof typeof ITEM_TYPES]
export type TextItemProperties = ItemProperties & { text: string; fontSize?: number }
export type Note = TextItemProperties & {
    type: typeof ITEM_TYPES.NOTE
    color: Color
    shape: "round" | "square" | undefined
}
export type Text = TextItemProperties & { type: typeof ITEM_TYPES.TEXT }
export type Image = ItemProperties & { type: typeof ITEM_TYPES.IMAGE; assetId: string; src?: string }
export type Container = TextItemProperties & { type: typeof ITEM_TYPES.CONTAINER; color: Color }

export type TextItem = Note | Text | Container
export type ColoredItem = Item & { color: Color }
export type ShapedItem = Note
export type Item = TextItem | Image
export type ItemLocks = Record<Id, Id>

export type RecentBoardAttributes = { id: Id; name: string }
export type RecentBoard = RecentBoardAttributes & { opened: ISOTimeStamp; userEmail: string | null }

export type BoardEvent = { boardId: Id }
export type UIEvent = BoardItemEvent | ClientToServerRequest | LocalUIEvent
export type LocalUIEvent = Undo | Redo | BoardJoinRequest
export type EventFromServer = BoardHistoryEntry | BoardStateSyncEvent | LoginResponse
export type Serial = number
export type AppEvent = BoardItemEvent | BoardStateSyncEvent | LocalUIEvent | ClientToServerRequest | LoginResponse
export type PersistableBoardItemEvent =
    | AddItem
    | UpdateItem
    | MoveItem
    | DeleteItem
    | IncreaseItemFont
    | DecreaseItemFont
    | BringItemToFront
    | BootstrapBoard
    | RenameBoard
export type BoardInit = InitBoardNew | InitBoardDiff
export type TransientBoardItemEvent = LockItem | UnlockItem
export type BoardItemEvent = PersistableBoardItemEvent | TransientBoardItemEvent
export type BoardStateSyncEvent =
    | BoardInit
    | BoardSerialAck
    | RecentBoardsFromServer
    | GotBoardLocks
    | CursorPositions
    | JoinedBoard
    | AuthLogin
    | AckJoinBoard
    | DeniedJoinBoard
    | UserInfoUpdate
    | ActionApplyFailed
    | AssetPutUrlResponse
    | Ack

export type ClientToServerRequest =
    | CursorMove
    | AddBoard
    | LockItem
    | UnlockItem
    | JoinBoard
    | AssociateBoard
    | DissociateBoard
    | SetNickname
    | AssetPutUrlRequest
    | AuthLogin
    | AuthLogout
    | Ping

export type LoginResponse =
    | { action: "auth.login.response"; success: false }
    | { action: "auth.login.response"; success: true; userId: string }
export type AuthLogin = { action: "auth.login"; name: string; email: string; token: string }
export type AuthLogout = { action: "auth.logout" }
export type Ping = { action: "ping" }
export type AddItem = { action: "item.add"; boardId: Id; items: Item[] }
export type UpdateItem = { action: "item.update"; boardId: Id; items: Item[] }
export type MoveItem = {
    action: "item.move"
    boardId: Id
    items: { id: Id; x: number; y: number; containerId?: Id | undefined }[]
}
export type IncreaseItemFont = { action: "item.font.increase"; boardId: Id; itemIds: Id[] }
export type DecreaseItemFont = { action: "item.font.decrease"; boardId: Id; itemIds: Id[] }
export type BringItemToFront = { action: "item.front"; boardId: Id; itemIds: Id[] }
export type DeleteItem = { action: "item.delete"; boardId: Id; itemIds: Id[] }
export type BootstrapBoard = { action: "item.bootstrap"; boardId: Id; items: Item[] }
export type LockItem = { action: "item.lock"; boardId: Id; itemId: Id }
export type UnlockItem = { action: "item.unlock"; boardId: Id; itemId: Id }
export type GotBoardLocks = { action: "board.locks"; boardId: Id; locks: ItemLocks }
export type AddBoard = { action: "board.add"; payload: Board | BoardStub }
export type JoinBoard = { action: "board.join"; boardId: Id; initAtSerial?: Serial }
export type AssociateBoard = { action: "board.associate"; boardId: Id; lastOpened: ISOTimeStamp }
export type DissociateBoard = { action: "board.dissociate"; boardId: Id }
export type AckJoinBoard = { action: "board.join.ack"; boardId: Id } & UserSessionInfo
export type DeniedJoinBoard = { action: "board.join.denied"; boardId: Id; reason: "unauthorized" | "forbidden" }
export type RecentBoardsFromServer = { action: "user.boards"; email: string; boards: RecentBoard[] }
export type Ack = { action: "ack" }
export type BoardSerialAck = { action: "board.serial.ack"; boardId: Id; serial: Serial }
export type ActionApplyFailed = { action: "board.action.apply.failed" }
export type JoinedBoard = { action: "board.joined"; boardId: Id } & UserSessionInfo
export type UserInfoUpdate = { action: "userinfo.set" } & UserSessionInfo
export type InitBoardNew = { action: "board.init"; board: Board }
export type InitBoardDiff = {
    action: "board.init"
    recentEvents: BoardHistoryEntry[]
    boardAttributes: BoardAttributes
    initAtSerial: Serial
}
export type RenameBoard = { action: "board.rename"; boardId: Id; name: string }
export type CursorMove = { action: "cursor.move"; position: CursorPosition; boardId: Id }
export type SetNickname = { action: "nickname.set"; nickname: string }
export type AssetPutUrlRequest = { action: "asset.put.request"; assetId: string }
export type AssetPutUrlResponse = { action: "asset.put.response"; assetId: string; signedUrl: string }
export type Undo = { action: "ui.undo" }
export type Redo = { action: "ui.redo" }
export type BoardJoinRequest = { action: "ui.board.join.request"; boardId: Id | undefined }

export const CURSOR_POSITIONS_ACTION_TYPE = "c" as const
export type CursorPositions = { action: typeof CURSOR_POSITIONS_ACTION_TYPE; p: Record<Id, UserCursorPosition> }

export const exampleBoard: Board = {
    id: "default",
    name: "Test Board",
    items: [newNote("Hello", "pink", 10, 5), newNote("World", "cyan", 20, 10), newNote("Welcome", "cyan", 5, 14)],
    ...defaultBoardSize,
    serial: 0,
}

export function createBoard(name: string, accessPolicy?: BoardAccessPolicy): Board {
    const id = uuid.v4()
    return { id: uuid.v4(), name, items: [], ...defaultBoardSize, serial: 0, accessPolicy }
}

export function newNote(
    text: string,
    color: Color = "#F5F18D",
    x: number = 20,
    y: number = 20,
    width: number = 5,
    height: number = 5,
    shape: "round" | "square" = "square",
    z: number = 0,
): Note {
    return { id: uuid.v4(), type: "note", text, color, x, y, width, height, z, shape }
}

export function newSimilarNote(note: Note) {
    return newNote("HELLO", note.color, 20, 20, note.width, note.height, note.shape)
}

export function newText(
    text: string = "HELLO",
    x: number = 20,
    y: number = 20,
    width: number = 5,
    height: number = 2,
    z: number = 0,
): Text {
    return { id: uuid.v4(), type: "text", text, x, y, width, height, z }
}

export function newContainer(
    x: number = 20,
    y: number = 20,
    width: number = 30,
    height: number = 20,
    z: number = 0,
): Container {
    return { id: uuid.v4(), type: "container", text: "Unnamed area", x, y, width, height, z, color: "white" }
}

export function newImage(
    assetId: string,
    x: number = 20,
    y: number = 20,
    width: number = 5,
    height: number = 5,
    z: number = 0,
): Image {
    return { id: uuid.v4(), type: "image", assetId, x, y, width, height, z }
}

export function getCurrentTime(): ISOTimeStamp {
    return new Date().toISOString()
}

export const isBoardItemEvent = (a: AppEvent): a is BoardItemEvent =>
    a.action.startsWith("item.") || a.action === "board.rename"

export const isPersistableBoardItemEvent = (e: any): e is PersistableBoardItemEvent =>
    isBoardItemEvent(e) && !["item.lock", "item.unlock"].includes(e.action)

export const isBoardHistoryEntry = (e: AppEvent): e is BoardHistoryEntry =>
    isPersistableBoardItemEvent(e) && !!(e as BoardHistoryEntry).user && !!(e as BoardHistoryEntry).timestamp
export const isLocalUIEvent = (e: AppEvent): e is LocalUIEvent => e.action.startsWith("ui.")

export function isSameUser(a: EventUserInfo, b: EventUserInfo) {
    return a.userType == b.userType && a.nickname == b.nickname
}

export function isColoredItem(i: Item): i is ColoredItem {
    return i.type === "note" || i.type === "container"
}

export function isShapedItem(i: Item): i is ShapedItem {
    return i.type === "note"
}

export function isTextItem(i: Item): i is TextItem {
    return i.type === "note" || i.type === "text" || i.type === "container"
}

export function isNote(i: Item): i is Note {
    return i.type === "note"
}

export function getItemText(i: Item) {
    if (i.type === "image") return ""
    return i.text
}

export function getItemBackground(i: Item) {
    if (isColoredItem(i)) {
        return i.color || "white" // Default for legacy containers
    }
    return "none"
}

export function getItemIds(e: BoardHistoryEntry | PersistableBoardItemEvent): Id[] {
    switch (e.action) {
        case "item.front":
        case "item.delete":
        case "item.font.decrease":
        case "item.font.increase":
            return e.itemIds
        case "item.move":
            return e.items.map((i) => i.id)
        case "item.update":
        case "item.add":
            return e.items.map((i) => i.id)
        case "item.bootstrap":
            return e.items.map((i) => i.id)
        case "board.rename":
            return []
    }
}

export const getItem = (board: Board | Item[]) => (id: Id) => {
    const item = findItem(board)(id)
    if (!item) throw Error("Item not found: " + id)
    return item
}

export const findItem = (board: Board | Item[]) => (id: Id) => {
    const items: Item[] = board instanceof Array ? board : board.items
    const item = items.find((i) => i.id === id)
    return item || null
}

export function findItemIdsRecursively(ids: Id[], board: Board): Set<Id> {
    const recursiveIds = new Set<Id>()
    const addIdRecursively = (id: Id) => {
        recursiveIds.add(id)
        board.items.forEach((i) => i.containerId === id && addIdRecursively(i.id))
    }
    ids.forEach(addIdRecursively)
    return recursiveIds
}

export function findItemsRecursively(ids: Id[], board: Board): Item[] {
    const recursiveIds = findItemIdsRecursively(ids, board)
    return [...recursiveIds].map(getItem(board))
}
