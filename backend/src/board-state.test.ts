describe("board state iteration", () => {
    it("is safe", () => {
        // Checking that map value iteration is safe when deleteting items on the way
        const boards = new Map<number, number>()
        boards.set(1, 1)
        boards.set(2, 2)
        const results: number[] = []
        for (let b of boards.values()) {
            results.push(b)
            boards.delete(b)
        }
        expect(results).toEqual([1, 2])
    })
})
