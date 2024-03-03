import { expect, test } from "@playwright/test"
import { sleep } from "../../../common/src/sleep"
import { navigateToNewBoard, semiUniqueId } from "../pages/BoardPage"

test.describe("Basic board functionality", () => {
    test("Can create note by dragging from palette", async ({ page }) => {
        const board = await navigateToNewBoard(page)
        const userPageNoteText = `note-${semiUniqueId()}`
        await board.createNoteWithText(100, 200, userPageNoteText)
    })

    test("Can create text by dragging from palette", async ({ page }) => {
        const board = await navigateToNewBoard(page)
        const userPageNoteText = `note-${semiUniqueId()}`
        await board.createText(100, 200, userPageNoteText)
    })

    test("Can create container by dragging from palette", async ({ page }) => {
        const board = await navigateToNewBoard(page)
        const userPageNoteText = `note-${semiUniqueId()}`
        await board.createArea(100, 200, userPageNoteText)
    })

    test("Dragging notes", async ({ page }) => {
        const board = await navigateToNewBoard(page)
        const monoids = await board.createNoteWithText(100, 200, "Monoids")
        const semigroups = await board.createNoteWithText(200, 200, "Semigroups")

        await test.step("Drag to new position", async () => {
            await board.dragItem(monoids, 300, 300)
            await board.assertItemPosition(monoids, 300, 300)
        })

        await test.step("Drag multiple items", async () => {
            await board.selectItems(monoids, semigroups)
            await board.dragItem(monoids, 400, 300)
            await board.assertItemPosition(monoids, 400, 300)
            await board.assertItemPosition(semigroups, 300, 200)
        })

        // TODO: test persistence
    })

    // TODO: test creating and modifying connections

    test("Changing note color", async ({ page }) => {
        const board = await navigateToNewBoard(page)
        const monoids = await board.createNoteWithText(100, 200, "Monoids")
        const colorsAndShapes = await board.contextMenu.openColorsAndShapes()
        await colorsAndShapes.selectColor("pink")
        await board.assertItemColor(monoids, "rgb(253, 196, 231)")
    })

    test.describe("Duplicate items", () => {
        test("Duplicate text by Ctrl+D", async ({ page }) => {
            const board = await navigateToNewBoard(page)
            const monoids = await board.createText(100, 200, "Monoids")
            const functors = await board.createNoteWithText(300, 200, "Functors")
            await board.selectItems(monoids, functors)
            await monoids.press("Control+d")
            await expect(monoids).toHaveCount(2)
            await expect(functors).toHaveCount(2)
        })

        test("Duplicating a container with child items", async ({ page }) => {
            const board = await navigateToNewBoard(page)
            const container = await board.createArea(100, 200, "Container")
            const text = await board.createText(150, 250, "text")
            await board.selectItems(container)
            await container.press("Control+d")
            const clonedText = board.getText("text").nth(1)
            await expect(clonedText).toHaveText("text")
        })

        test("Duplicating deeper hierarchy", async ({ page }) => {
            const board = await navigateToNewBoard(page)
            const container = await board.createArea(100, 200, "Top")
            await board.dragSelectionBottomCorner(550, 550)
            const container2 = await board.createArea(110, 220, "Middle")
            const text = await board.createText(150, 250, "Bottom")
            await board.selectItems(container)
            await container.press("Control+d")
            const clonedText = board.getText("Bottom").nth(1)
            await expect(clonedText).toHaveText("Bottom")
        })
    })

    test.skip("Copy, paste and cut", async ({ page }) => {
        // TODO: not sure how to trigger native copy, paste events
        const board = await navigateToNewBoard(page)
        const monoids = await board.createNoteWithText(100, 200, "Monoids")
        await page.keyboard.press("Control+c", {})
        await board.clickOnBoard({ x: 500, y: 300 })
        await page.keyboard.press("Control+v")

        await board.changeItemText(board.getNote("Monoids"), "Monads")
        await expect(board.getNote("Monoids")).toBeVisible()
        await expect(board.getNote("Monads")).toBeVisible()
    })

    test("Move items with arrow keys", async ({ page }) => {
        const board = await navigateToNewBoard(page)
        const monoids = await board.createNoteWithText(100, 200, "Monoids")
        const origPos = await board.getItemPosition(monoids)
        await test.step("Normally", async () => {
            await page.keyboard.press("ArrowRight")
            expect(await board.getItemPosition(monoids)).toEqual({ x: origPos.x + 14, y: origPos.y })
        })
        await test.step("Faster with shift", async () => {
            await page.keyboard.press("Shift+ArrowLeft")
            expect(await board.getItemPosition(monoids)).toEqual({ x: origPos.x - 125, y: origPos.y })
        })
        await test.step("Slower with alt", async () => {
            await page.keyboard.press("Alt+ArrowDown")
            expect(await board.getItemPosition(monoids)).toEqual({ x: origPos.x - 125, y: origPos.y + 1 })
        })
    })

    test("Deleting notes", async ({ page }) => {
        const board = await navigateToNewBoard(page)
        const monoids = await board.createNoteWithText(100, 200, "Monoids")

        await test.step("With delete key", async () => {
            await page.keyboard.press("Delete")
            await expect(monoids).not.toBeVisible()
        })

        await test.step("With backspace key", async () => {
            const functors = await board.createNoteWithText(100, 200, "Functors")
            await page.keyboard.press("Delete")
            await expect(functors).not.toBeVisible()
        })
    })

    test("Aligning notes", async ({ page }) => {
        const board = await navigateToNewBoard(page)
        const n1 = await board.createNoteWithText(250, 120, "ALIGN")
        const n2 = await board.createNoteWithText(450, 100, "ALL")
        const n3 = await board.createNoteWithText(320, 250, "THESE")
        await board.createNoteWithText(300, 450, "BUT NOT THIS")
        await board.selectItems(n1, n2, n3)
        const originalCoordinates = await Promise.all([n1, n2, n3].map((n) => board.getItemPosition(n)))
        await (await board.contextMenu.openHorizontalAlign()).left.click()
        const newCoordinates = await Promise.all([n1, n2, n3].map((n) => board.getItemPosition(n)))
        expect(newCoordinates.every((c) => c.x === originalCoordinates[0].x)).toBeTruthy()
    })

    test("Can edit note text", async ({ page }) => {
        const board = await navigateToNewBoard(page)
        const monoids = await board.createNoteWithText(100, 200, "Monoids")
        const semigroups = await board.createNoteWithText(200, 200, "Semigroups")

        await test.step("Change text", async () => {
            await board.changeItemText(board.getNote("Monoids"), "Monads")
            await expect(board.getNote("Monads")).toBeVisible()
            await board.changeItemText(board.getNote("Monads"), "Monoids")
        })

        await test.step("Check persistence", async () => {
            await sleep(1000) // Time for persistence
            await page.reload()
            await expect(monoids).toBeVisible()
            await expect(semigroups).toBeVisible()
        })
    })

    test("Resizing notes", async ({ page }) => {
        const board = await navigateToNewBoard(page)
        const monoids = await board.createNoteWithText(100, 200, "Monoids")

        await test.step("Can drag to resize items", async () => {
            await board.selectItems(monoids)
            await board.dragSelectionBottomCorner(550, 550)
            await board.assertItemSize(monoids, 380, 380)
        })
    })

    test("Selecting notes", async ({ page }) => {
        const board = await navigateToNewBoard(page)
        const monoids = await board.createNoteWithText(150, 200, "Monoids")
        const semigroups = await board.createNoteWithText(250, 200, "SemiGroups")

        async function resetSelection() {
            await board.clickOnBoard({ x: 100, y: 100 })
            await board.assertSelected(monoids, false)
        }

        await test.step("Can select note by dragging on board with ALT pressed", async () => {
            await resetSelection()
            await board.dragOnBoard({ x: 100, y: 100 }, { x: 300, y: 300 }, { altKey: true })
            await board.assertSelected(monoids)
        })

        await test.step("Can select notes with SHIFT key", async () => {
            await resetSelection()
            await board.selectItems(monoids, semigroups)
            await board.assertSelected(monoids)
            await board.assertSelected(semigroups)
        })
    })
})
