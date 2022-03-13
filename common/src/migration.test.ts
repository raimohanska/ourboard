import { arrayToRecordById } from "./arrays"
import {
    AddConnection,
    AddItem,
    Board,
    Connection,
    ConnectionEndPoint,
    defaultBoardSize,
    DeleteConnection,
    DeleteItem,
    exampleBoard,
    ModifyConnection,
    MoveItem,
} from "./domain"
import { migrateBoard, migrateEvent } from "./migration"

describe("Migration", () => {
    describe("Migrate board", () => {
        it("Migrates boards correctly", () => {
            const containedNoteWithNoType = {
                id: "a",
                x: 1,
                y: 1,
                width: 1,
                height: 1,
                text: "note a",
                color: "yellow",
            }
            const containedNote2 = {
                type: "note",
                id: "b",
                x: 2,
                y: 2,
                width: 1,
                height: 1,
                text: "note b",
                color: "yellow",
            }
            const unContainedNoteWithNoDimensions = {
                type: "note",
                id: "c",
                x: 3,
                y: 3,
                text: "note c",
                color: "yellow",
            }
            const oldFormContainerWithItemsAndNoText = {
                type: "container",
                id: "d",
                x: 0,
                y: 0,
                width: 5,
                height: 5,
                items: ["a", "b"],
            }

            const legacyBoard: any = {
                id: "foo",
                name:
                    "board with no size, where containers have items property and items do not have containerId property",
                items: [
                    containedNoteWithNoType,
                    containedNote2,
                    unContainedNoteWithNoDimensions,
                    oldFormContainerWithItemsAndNoText,
                ],
            }

            const board = migrateBoard(legacyBoard)

            expect(board).toEqual({
                ...legacyBoard,
                ...defaultBoardSize,
                connections: [],
                items: arrayToRecordById([
                    { ...containedNoteWithNoType, type: "note", containerId: "d", z: 0 },
                    { ...containedNote2, containerId: "d", z: 0 },
                    { ...unContainedNoteWithNoDimensions, width: 5, height: 5, z: 0 },
                    { type: "container", id: "d", x: 0, y: 0, width: 5, height: 5, z: 0, text: "" },
                ]),
            })
        })
        it("Removes broken connections", () => {
            const borkenEndpoint: ConnectionEndPoint = { id: "asdf", side: "bottom" }

            const b: Board = {
                ...exampleBoard,
                connections: [
                    {
                        from: borkenEndpoint,
                        to: borkenEndpoint,
                        id: "asfdoi",
                        controlPoints: [],
                        fromStyle: "none",
                        toStyle: "none",
                        pointStyle: "none",
                    },
                ],
            }

            expect(migrateBoard(b)).toEqual(exampleBoard)
        })

        it("Sets connection end styles", () => {
            const b: Board = {
                ...exampleBoard,
                connections: [{ from: { x: 0, y: 0 }, to: { x: 0, y: 0 }, id: "asfdoi", controlPoints: [] } as any],
            }

            expect(migrateBoard(b)).toEqual({
                ...exampleBoard,
                connections: [
                    {
                        from: { x: 0, y: 0 },
                        to: { x: 0, y: 0 },
                        id: "asfdoi",
                        controlPoints: [],
                        fromStyle: "black-dot",
                        toStyle: "arrow",
                        pointStyle: "black-dot",
                    } as Connection,
                ],
            })
        })
    })
    describe("Migrate event", () => {
        const headers = {
            user: { userType: "unidentified", nickname: "asdf" },
            timestamp: new Date().toISOString(),
            boardId: "",
        }
        it("connection.add", () => {
            const connection = { from: "a", to: "b", controlPoints: [], id: "c" }
            expect(
                (migrateEvent({
                    ...headers,
                    action: "connection.add",
                    connection,
                } as any) as AddConnection).connections,
            ).toEqual([connection])
            expect(
                (migrateEvent({
                    ...headers,
                    action: "connection.add",
                    connection: [connection],
                } as any) as AddConnection).connections,
            ).toEqual([connection])
        })

        it("connection.modify", () => {
            const connection = { from: "a", to: "b", controlPoints: [], id: "c" }
            expect(
                (migrateEvent({
                    ...headers,
                    action: "connection.modify",
                    connection,
                } as any) as ModifyConnection).connections,
            ).toEqual([connection])
            expect(
                (migrateEvent({
                    ...headers,
                    action: "connection.modify",
                    connection: [connection],
                } as any) as ModifyConnection).connections,
            ).toEqual([connection])
        })

        it("connection.delete", () => {
            const connectionId = "c"
            expect(
                (migrateEvent({
                    ...headers,
                    action: "connection.delete",
                    connectionId,
                } as any) as DeleteConnection).connectionIds,
            ).toEqual([connectionId])
            expect(
                (migrateEvent({
                    ...headers,
                    action: "connection.delete",
                    connectionId: [connectionId],
                } as any) as DeleteConnection).connectionIds,
            ).toEqual([connectionId])
        })

        it("item.move", () => {
            expect(
                (migrateEvent({
                    ...headers,
                    action: "item.move",
                    items: [],
                } as any) as MoveItem).connections,
            ).toEqual([])
        })

        it("item.delete", () => {
            expect(
                (migrateEvent({
                    ...headers,
                    action: "item.delete",
                    itemIds: [],
                } as any) as DeleteItem).connectionIds,
            ).toEqual([])
        })

        it("item.add", () => {
            expect(
                (migrateEvent({
                    ...headers,
                    action: "item.add",
                    items: [],
                } as any) as AddItem).connections,
            ).toEqual([])
        })
    })
})
