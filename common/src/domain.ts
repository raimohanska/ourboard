import _ from "lodash"
import * as uuid from "uuid"
import * as t from "io-ts"
import { LIGHT_BLUE, PINK, RED, YELLOW } from "./colors"
import { arrayToRecordById } from "./arrays"

export type Id = string
export type ISOTimeStamp = string

export function optional<T extends t.Type<any>>(c: T) {
    return t.union([c, t.undefined, t.null])
}

export type BoardAttributes = {
    id: Id
    name: string
    width: number
    height: number
    accessPolicy?: BoardAccessPolicy
}

export type BoardContents = {
    items: Record<Id, Item>
    connections: Connection[]
}

export type Board = BoardAttributes &
    BoardContents & {
        serial: Serial
    }

export type BoardStub = Pick<Board, "id" | "name" | "accessPolicy"> & { templateId?: Id }

export const AccessLevelCodec = t.union([
    t.literal("admin"),
    t.literal("read-write"),
    t.literal("read-only"),
    t.literal("none"),
])
export type AccessLevel = t.TypeOf<typeof AccessLevelCodec>
export const AccessListEntryCodec = t.union([
    t.type({
        email: t.string,
        access: optional(AccessLevelCodec),
    }),
    t.type({
        domain: t.string,
        access: optional(AccessLevelCodec),
    }),
])
export type AccessListEntry = t.TypeOf<typeof AccessListEntryCodec>
export const BoardAccessPolicyDefinedCodec = t.type({
    allowList: t.array(AccessListEntryCodec),
    publicRead: optional(t.boolean),
    publicWrite: optional(t.boolean),
})
export type BoardAccessPolicyDefined = t.TypeOf<typeof BoardAccessPolicyDefinedCodec>
export const BoardAccessPolicyCodec = t.union([t.undefined, BoardAccessPolicyDefinedCodec])
export type BoardAccessPolicy = t.TypeOf<typeof BoardAccessPolicyCodec>

export type AuthorizedParty = AuthorizedByEmailAddress | AuthorizedByDomain
export type AuthorizedByEmailAddress = { email: string }
export type AuthorizedByDomain = { domain: string }

export type EventUserInfo = UnidentifiedUserInfo | SystemUserInfo | EventUserInfoAuthenticated

export type UnidentifiedUserInfo = { nickname: string; userType: "unidentified" }
export type SystemUserInfo = { nickname: string; userType: "system" }

export type EventUserInfoAuthenticated = {
    nickname: string
    userType: "authenticated"
    name: string
    email: string
    userId: string
}

export type SessionUserInfo = UnidentifiedUserInfo | SystemUserInfo | SessionUserInfoAuthenticated

export type SessionUserInfoAuthenticated = {
    nickname: string
    userType: "authenticated"
    name: string
    email: string
    picture: string | undefined
    userId: string
}

export type UserSessionInfo = SessionUserInfo & {
    sessionId: Id
}

export type BoardHistoryEntry = {
    user: EventUserInfo
    timestamp: ISOTimeStamp
    serial?: Serial
    firstSerial?: Serial
} & PersistableBoardItemEvent
export type BoardWithHistory = { board: Board; history: BoardHistoryEntry[] }
export type CompactBoardHistory = { boardAttributes: BoardAttributes; history: BoardHistoryEntry[] }

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
    VIDEO: "video",
    CONTAINER: "container",
} as const
export type ItemType = typeof ITEM_TYPES[keyof typeof ITEM_TYPES]
export type TextItemProperties = ItemProperties & { text: string; fontSize?: number }
export type NoteShape = "round" | "square" | "rect" | "diamond"
export type Note = TextItemProperties & {
    type: typeof ITEM_TYPES.NOTE
    color: Color
    shape: NoteShape | undefined
}
export type Text = TextItemProperties & { type: typeof ITEM_TYPES.TEXT }
export type Image = ItemProperties & { type: typeof ITEM_TYPES.IMAGE; assetId: string; src?: string }
export type Video = ItemProperties & { type: typeof ITEM_TYPES.VIDEO; assetId: string; src?: string }
export type Container = TextItemProperties & { type: typeof ITEM_TYPES.CONTAINER; color: Color }

export type Point = { x: number; y: number }
export function Point(x: number, y: number) {
    return { x, y }
}
export const isPoint = (u: unknown): u is Point => typeof u === "object" && !!u && "x" in u && "y" in u
export type ConnectionEndStyle = "none" | "arrow" | "black-dot"
export type Connection = {
    id: Id
    from: ConnectionEndPoint
    controlPoints: Point[]
    to: ConnectionEndPoint
    containerId?: string
    fromStyle: ConnectionEndStyle
    toStyle: ConnectionEndStyle
    pointStyle: "none" | "black-dot"
}
export type ConnectionEndPoint = Point | ConnectionEndPointToItem
export type ConnectionEndPointToItem = Id | ConectionEndPointDirectedToItem
export type ConectionEndPointDirectedToItem = { id: Id; side: AttachmentSide }
export function getEndPointItemId(e: ConnectionEndPointToItem) {
    if (typeof e === "string") return e
    return e.id
}
export function isItemEndPoint(e: ConnectionEndPoint): e is ConnectionEndPointToItem {
    if (typeof e === "string") return true
    if ("side" in e) return true
    return false
}
export function isDirectedItemEndPoint(e: ConnectionEndPoint): e is ConectionEndPointDirectedToItem {
    return isItemEndPoint(e) && typeof e === "object"
}
export type AttachmentSide = "left" | "right" | "top" | "bottom"
export type AttachmentLocation = { side: "none"; point: Point } | ItemAttachmentLocation
export type ItemAttachmentLocation = { side: AttachmentSide; point: Point; item: Item }

export type RenderableConnection = Omit<Connection, "from" | "to"> & {
    from: AttachmentLocation
    to: AttachmentLocation
}

export type TextItem = Note | Text | Container
export type ColoredItem = Item & { color: Color }
export type ShapedItem = Note
export type Item = TextItem | Image | Video
export type ItemLocks = Record<Id, Id>

export type RecentBoardAttributes = { id: Id; name: string }
export type RecentBoard = RecentBoardAttributes & { opened: ISOTimeStamp; userEmail: string | null }

export type BoardEvent = { boardId: Id }
export type UIEvent = BoardItemEvent | ClientToServerRequest | LocalUIEvent
export type LocalUIEvent = Undo | Redo | BoardJoinRequest | BoardLoggedOut | GoOffline
export type EventFromServer = BoardHistoryEntry | BoardStateSyncEvent | LoginResponse | AckAddBoard
export type Serial = number
export type AppEvent =
    | BoardItemEvent
    | BoardStateSyncEvent
    | LocalUIEvent
    | ClientToServerRequest
    | LoginResponse
    | AckAddBoard
export type EventWrapper = {
    events: AppEvent[]
    ackId?: string
}
export type PersistableBoardItemEvent =
    | AddItem
    | UpdateItem
    | MoveItem
    | DeleteItem
    | AddConnection
    | ModifyConnection
    | DeleteConnection
    | IncreaseItemFont
    | DecreaseItemFont
    | BringItemToFront
    | BootstrapBoard
    | RenameBoard
    | SetBoardAccessPolicy
export type BoardInit = InitBoardNew | InitBoardDiff
export type TransientBoardItemEvent = LockItem | UnlockItem
export type BoardItemEvent = PersistableBoardItemEvent | TransientBoardItemEvent
export type BoardStateSyncEvent =
    | BoardInit
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
export type AddConnection = { action: "connection.add"; boardId: Id; connections: Connection[] }
export type ModifyConnection = { action: "connection.modify"; boardId: Id; connections: Connection[] }
export type DeleteConnection = { action: "connection.delete"; boardId: Id; connectionIds: Id[] }
export type AuthLogin = {
    action: "auth.login"
    name: string
    email: string
    picture: string | undefined
    token: string
}
export type AuthLogout = { action: "auth.logout" }
export type Ping = { action: "ping" }
export type AddItem = { action: "item.add"; boardId: Id; items: Item[]; connections: Connection[] }
export type UpdateItem = { action: "item.update"; boardId: Id; items: Item[] }
export type MoveItem = {
    action: "item.move"
    boardId: Id
    items: { id: Id; x: number; y: number; containerId?: Id | undefined }[]
    connections: { id: Id; x: number; y: number }[] // Coordinates are for connection start point.
}
export type IncreaseItemFont = { action: "item.font.increase"; boardId: Id; itemIds: Id[] }
export type DecreaseItemFont = { action: "item.font.decrease"; boardId: Id; itemIds: Id[] }
export type BringItemToFront = { action: "item.front"; boardId: Id; itemIds: Id[] }
export type DeleteItem = { action: "item.delete"; boardId: Id; itemIds: Id[]; connectionIds: Id[] }
export type BootstrapBoard = { action: "item.bootstrap"; boardId: Id } & BoardContents
export type LockItem = { action: "item.lock"; boardId: Id; itemId: Id }
export type UnlockItem = { action: "item.unlock"; boardId: Id; itemId: Id }
export type GotBoardLocks = { action: "board.locks"; boardId: Id; locks: ItemLocks }
export type AddBoard = { action: "board.add"; payload: Board | BoardStub }
export type AckAddBoard = { action: "board.add.ack"; boardId: Id }
export type JoinBoard = { action: "board.join"; boardId: Id; initAtSerial?: Serial }
export type AssociateBoard = { action: "board.associate"; boardId: Id; lastOpened: ISOTimeStamp }
export type DissociateBoard = { action: "board.dissociate"; boardId: Id }
export type SetBoardAccessPolicy = {
    action: "board.setAccessPolicy"
    boardId: Id
    accessPolicy: BoardAccessPolicyDefined
}
export type AckJoinBoard = { action: "board.join.ack"; boardId: Id } & UserSessionInfo
export type DeniedJoinBoard =
    | {
          action: "board.join.denied"
          boardId: Id
          reason: "unauthorized" | "forbidden" | "not found"
      }
    | {
          action: "board.join.denied"
          boardId: Id
          reason: "redirect"
          wsAddress: string
      }
export type RecentBoardsFromServer = { action: "user.boards"; email: string; boards: RecentBoard[] }
export type Ack = { action: "ack"; ackId: string; serials: Record<Id, Serial> }
export type ActionApplyFailed = { action: "board.action.apply.failed" }
export type JoinedBoard = { action: "board.joined"; boardId: Id } & UserSessionInfo
export type UserInfoUpdate = { action: "userinfo.set" } & UserSessionInfo
export type InitBoardNew = { action: "board.init"; board: Board; accessLevel: AccessLevel }
export type InitBoardDiff = {
    action: "board.init.diff"
    initAtSerial: Serial
    first: boolean
    last: boolean
    recentEvents: BoardHistoryEntry[]
    boardAttributes: BoardAttributes
    accessLevel: AccessLevel
}
export type RenameBoard = { action: "board.rename"; boardId: Id; name: string }
export type CursorMove = { action: "cursor.move"; position: CursorPosition; boardId: Id }
export type SetNickname = { action: "nickname.set"; nickname: string }
export type AssetPutUrlRequest = { action: "asset.put.request"; assetId: string }
export type AssetPutUrlResponse = { action: "asset.put.response"; assetId: string; signedUrl: string }
export type Undo = { action: "ui.undo" }
export type Redo = { action: "ui.redo" }
export type BoardJoinRequest = { action: "ui.board.join.request"; boardId: Id | undefined }
export type BoardLoggedOut = { action: "ui.board.logged.out"; boardId: Id }
export type GoOffline = { action: "ui.offline" }

export const CURSOR_POSITIONS_ACTION_TYPE = "c" as const
export type CursorPositions = { action: typeof CURSOR_POSITIONS_ACTION_TYPE; p: Record<Id, UserCursorPosition> }

export const exampleBoard: Board = {
    id: "default",
    name: "Test Board",
    items: arrayToRecordById([
        newNote("Hello", PINK, 10, 5),
        newNote("World", LIGHT_BLUE, 20, 10),
        newNote("Welcome", RED, 5, 14),
    ]),
    connections: [],
    ...defaultBoardSize,
    serial: 0,
}

export function newBoard(name: string, accessPolicy?: BoardAccessPolicy): Board {
    return { id: uuid.v4(), name, items: {}, accessPolicy, connections: [], ...defaultBoardSize, serial: 0 }
}

export function newNote(
    text: string,
    color: Color = YELLOW,
    x: number = 20,
    y: number = 20,
    width: number = 5,
    height: number = 5,
    shape: NoteShape = "square",
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

export function newVideo(
    assetId: string,
    x: number = 20,
    y: number = 20,
    width: number = 5,
    height: number = 5,
    z: number = 0,
): Video {
    return { id: uuid.v4(), type: "video", assetId, x, y, width, height, z }
}

export function getCurrentTime(): ISOTimeStamp {
    return new Date().toISOString()
}

export const isBoardItemEvent = (a: AppEvent): a is BoardItemEvent =>
    a.action.startsWith("item.") ||
    a.action.startsWith("connection.") ||
    a.action === "board.rename" ||
    a.action === "board.setAccessPolicy"

export const isPersistableBoardItemEvent = (e: any): e is PersistableBoardItemEvent =>
    isBoardItemEvent(e) && !["item.lock", "item.unlock"].includes(e.action)

export const isBoardHistoryEntry = (e: AppEvent): e is BoardHistoryEntry =>
    isPersistableBoardItemEvent(e) && !!(e as BoardHistoryEntry).user && !!(e as BoardHistoryEntry).timestamp
export const isLocalUIEvent = (e: AppEvent): e is LocalUIEvent => e.action.startsWith("ui.")
export const isCursorMove = (e: AppEvent): e is CursorMove => e.action === "cursor.move"
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

export function isContainer(i: Item): i is Container {
    return i.type === "container"
}

export function isItem(i: Item | Point | Connection): i is Item {
    return "type" in i
}

export function getItemText(i: Item) {
    if (isTextItem(i)) return i.text
    return ""
}

export function getItemBackground(i: Item) {
    if (isColoredItem(i)) {
        return i.color || "white" // Default for legacy containers
    }
    return "none"
}

export function getItemShape(i: Item) {
    return i.type === "note" && i.shape ? i.shape : "rect"
}

type NamespacedEvent<Namespace extends string, T = AppEvent> = T extends { action: `${Namespace}.${string}` }
    ? T
    : never

export function actionNamespaceIs<Namespace extends string>(
    ns: Namespace,
    a: AppEvent,
): a is NamespacedEvent<Namespace> {
    return a.action.startsWith(ns + ".")
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
            return Object.keys(e.items)
        case "board.rename":
        case "board.setAccessPolicy":
        case "connection.add":
        case "connection.modify":
        case "connection.delete":
            return []
    }
}

export const getItem = (boardOrItems: Board | Record<string, Item>) => (id: Id) => {
    const item = findItem(boardOrItems)(id)
    if (!item) throw Error("Item not found: " + id)
    return item
}

export const getConnection = (b: Board) => (id: Id) => {
    const conn = b.connections.find((c) => c.id === id)
    if (!conn) throw Error("Connection not found: " + id)
    return conn
}

export const findItem = (boardOrItems: Board | Record<string, Item>) => (id: Id) => {
    const items = getItems(boardOrItems)
    const item = items[id]
    return item || null
}

export const findConnection = (board: Board) => (id: Id) => {
    const conn = board.connections.find((c) => c.id === id)
    return conn || null
}

export function findItemIdsRecursively(ids: Id[], board: Board): Set<Id> {
    const recursiveIds = new Set<Id>()
    const addIdRecursively = (id: Id) => {
        recursiveIds.add(id)
        Object.values(board.items).forEach((i) => i.containerId === id && addIdRecursively(i.id))
    }
    ids.forEach(addIdRecursively)
    return recursiveIds
}

export function findItemsRecursively(ids: Id[], board: Board): Item[] {
    const recursiveIds = findItemIdsRecursively(ids, board)
    return [...recursiveIds].map(getItem(board))
}

export const isContainedBy = (boardOrItems: Board | Record<string, Item>, parentCandidate: Item) => (
    i: Item,
): boolean => {
    if (!i.containerId) return false
    if (i.containerId === parentCandidate!.id) return true
    const itemsOnBoard = getItems(boardOrItems)
    const parent = findItem(itemsOnBoard)(i.containerId)
    if (i.containerId === i.id) throw Error("Self-contained")
    if (parent == i) throw Error("self parent")
    if (!parent) return false // Don't fail here, because when folding create+move, the action is run in an incomplete board context
    return isContainedBy(boardOrItems, parentCandidate)(parent)
}

const isBoard = (u: unknown): u is Board => typeof u === "object" && !!u && "items" in u

const getItems = (boardOrItems: Board | Record<string, Item>) =>
    isBoard(boardOrItems) ? boardOrItems.items : boardOrItems

export function isBoardEmpty(board: Board) {
    return board.connections.length === 0 && Object.values(board.items).length === 0
}

export function getBoardAttributes(board: Board, userInfo?: EventUserInfo): BoardAttributes {
    const accessPolicy = board.accessPolicy
        ? userInfo && userInfo.userType === "authenticated"
            ? board.accessPolicy
            : { ...board.accessPolicy, allowList: [] } // Anonymize access policy for anonymous users
        : undefined
    return {
        id: board.id,
        name: board.name,
        width: board.width,
        height: board.height,
        accessPolicy,
    }
}

export const BOARD_ITEM_BORDER_MARGIN = 0.5

export function checkBoardAccess(accessPolicy: BoardAccessPolicy | undefined, userInfo: EventUserInfo): AccessLevel {
    if (!accessPolicy) return "read-write"
    let accessLevel: AccessLevel = accessPolicy.publicWrite
        ? "read-write"
        : accessPolicy.publicRead
        ? "read-only"
        : "none"
    if (userInfo.userType === "unidentified" || userInfo.userType === "system") {
        return accessLevel
    }
    const email = userInfo.email
    const defaultAccess = "read-write"
    for (let entry of accessPolicy.allowList) {
        const nextLevel =
            "email" in entry && entry.email === email
                ? entry.access || defaultAccess
                : "domain" in entry && email.endsWith(entry.domain)
                ? entry.access || defaultAccess
                : "none"
        accessLevel = combineAccessLevels(accessLevel, nextLevel)
    }
    return accessLevel
}

function combineAccessLevels(a: AccessLevel, b: AccessLevel): AccessLevel {
    if (a === "admin" || b === "admin") return "admin"
    if (a === "read-write" || b === "read-write") return "read-write"
    if (a === "read-only" || b === "read-only") return "read-only"
    return "none"
}

export function canRead(a: AccessLevel) {
    return a !== "none"
}

export function canWrite(a: AccessLevel) {
    return a === "read-write" || a === "admin"
}
