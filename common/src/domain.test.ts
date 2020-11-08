import { migrateBoard, defaultBoardSize } from "./domain"

describe("Domain", () => {
    describe("Migrate board", () => {
        it("Migrates boards correctly", () => {
            const containedNoteWithNoType = { id: "a", x: 1, y: 1, width: 1, height: 1, text: "note a", color: "yellow" }
            const containedNote2 = { type: "note", id: "b", x: 2, y: 2, width: 1, height: 1, text: "note b", color: "yellow" }
            const unContainedNoteWithNoDimensions = { type: "note", id: "c", x: 3, y: 3, text: "note c", color: "yellow" }
            const oldFormContainerWithItemsAndNoText = { type: "container", id: "d", x: 0, y: 0, width: 5, height: 5, items: ["a", "b"] }

            const legacyBoard: any = {
                id: "foo",
                name: "board with no size, where containers have items property and items do not have containerId property",
                items: [
                    containedNoteWithNoType,
                    containedNote2,
                    unContainedNoteWithNoDimensions,
                    oldFormContainerWithItemsAndNoText
                ]
            }

            const board = migrateBoard(legacyBoard)

            expect(board).toEqual({
                ...legacyBoard,
                ...defaultBoardSize,
                items: [
                    { ...containedNoteWithNoType, type: "note", containerId: "d" },
                    { ...containedNote2, containerId: "d" },
                    { ...unContainedNoteWithNoDimensions, width: 5, height: 5 },
                    { type: "container", id: "d", x: 0, y: 0, width: 5, height: 5, text: "" }
                ]
            })
        })
    })
})