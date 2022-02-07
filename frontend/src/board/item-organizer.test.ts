import { newNote } from "../../../common/src/domain"
import { overlaps } from "../../../common/src/geometry"
import { organizeItems } from "./item-organizer"

describe("organizeItems", () => {
    const rect = { x: 10, y: 10, width: 100, height: 100 }
    const itemsToAvoid = [{ ...newNote("a1"), x: 10, y: 10, width: 40, height: 40 }]
    const b1 = { ...newNote("b1"), width: 20, height: 20 }
    const b2 = { ...newNote("b2"), width: 20, height: 20 }

    it("Overlap", () => {
        expect(overlaps({ x: 10, y: 10, width: 5, height: 5 }, { x: 9, y: 9, width: 42, height: 42 })).toEqual(true)
        expect(overlaps({ x: 51, y: 10, width: 5, height: 5 }, { x: 9, y: 9, width: 42, height: 42 })).toEqual(false)
    })
    it("Single row", () => {
        const itemsToPlace = [b1, b2]
        expect(organizeItems(itemsToPlace, itemsToAvoid, rect)).toEqual([
            { ...b1, x: 51, y: 10 },
            { ...b2, x: 72, y: 10 },
        ])
    })

    it("Multiple rows", () => {
        const b3 = { ...newNote("b3"), width: 80, height: 20 }
        const itemsToPlace = [b1, b2, b3]
        const result1 = [
            { ...b1, x: 51, y: 10 },
            { ...b2, x: 72, y: 10 },
            { ...b3, x: 10, y: 51 },
        ]
        expect(organizeItems(itemsToPlace, itemsToAvoid, rect)).toEqual(result1)

        // Now test that it's somewhat stable when it comes to existing placements
        const result1Shuffled = [
            { ...b3, x: 10, y: 51 },
            { ...b2, x: 72, y: 10 },
            { ...b1, x: 51, y: 10 },
        ]
        expect(organizeItems(result1Shuffled, itemsToAvoid, rect)).toEqual([])
    })

    it("Clean new rows when different sizes on a row", () => {
        const itemsToAvoid = [
            { ...newNote("a1"), x: 10, y: 10, width: 10, height: 50 },
            { ...newNote("a2"), x: 20, y: 10, width: 90, height: 10 },
        ]
        const itemsToPlace = [b1, b2]
        expect(organizeItems(itemsToPlace, itemsToAvoid, rect)).toEqual([
            { ...b1, x: 10, y: 61 },
            { ...b2, x: 31, y: 61 },
        ])
    })
})
