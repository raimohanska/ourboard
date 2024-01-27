import { Browser, chromium, expect, test } from "@playwright/test"
import { navigateToBoard, navigateToNewBoard } from "../pages/BoardPage"
import { semiUniqueId } from "./collaboration.spec"

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
            await board.assertItemPosition(semigroups, 300, 197)
        })
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
            await expect(monoids).toHaveCSS("width", "382.562px")
        })
    })

    test("Selecting notes", async ({ page }) => {
        const board = await navigateToNewBoard(page)
        const monoids = await board.createNoteWithText(150, 200, "Monoids")
        const semigroups = await board.createNoteWithText(250, 200, "SemiGroups")

        async function resetSelection() {
            await board.scrollContainer.click({ position: { x: 100, y: 100 } })
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
