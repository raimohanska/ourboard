import { expect, test } from "@playwright/test"
import { sleep } from "../../../common/src/sleep"
import { navigateToNewBoard, semiUniqueId } from "../pages/BoardPage"

test.describe("Basic board functionality", () => {
    test("Create note by dragging from palette", async ({ page, browser }) => {
        const board = await navigateToNewBoard(page, browser)
        const userPageNoteText = `note-${semiUniqueId()}`
        await board.createNoteWithText(100, 200, userPageNoteText)
    })

    test("Create text by dragging from palette", async ({ page, browser }) => {
        const board = await navigateToNewBoard(page, browser)
        const userPageNoteText = `note-${semiUniqueId()}`
        await board.createText(100, 200, userPageNoteText)
    })

    test("Create container by dragging from palette", async ({ page, browser }) => {
        const board = await navigateToNewBoard(page, browser)
        const userPageNoteText = `note-${semiUniqueId()}`
        await board.createArea(100, 200, userPageNoteText)
    })

    test("Create note by double clicking on board", async ({ page, browser }) => {
        const board = await navigateToNewBoard(page, browser)
        await board.board.dblclick({ position: { x: 200, y: 200 } })
        await expect(board.getNote("HELLO")).toBeVisible()

        await test.step("Also inside an Area", async () => {
            await board.createArea(300, 200, "Container")
            await board.board.dblclick({ position: { x: 350, y: 250 } })
            await expect(board.getNote("HELLO")).toHaveCount(2)
        })
    })

    test("Drag notes", async ({ page, browser }) => {
        const board = await navigateToNewBoard(page, browser)
        const monoids = await board.createNoteWithText(100, 200, "Monoids")
        const semigroups = await board.createNoteWithText(200, 200, "Semigroups")

        await test.step("Drag to new position", async () => {
            await board.dragItem(monoids, 300, 300)
            await board.assertItemPosition(monoids, 300, 300)
        })

        const area = await board.createArea(450, 100, "Container")
        await test.step("Drag multiple items", async () => {
            await board.selectItems(monoids, semigroups)
            await board.dragItem(monoids, 600, 300)
            await board.assertItemPosition(monoids, 600, 300)
            await board.assertItemPosition(semigroups, 500, 200)
        })

        await test.step("Drag area to move contained items", async () => {
            await board.dragItem(area, 300, 300)
            await board.assertItemPosition(area, 300, 300)
            await board.assertItemPosition(monoids, 240, 360)
            await board.assertItemPosition(semigroups, 140, 260)
        })
    })

    // TODO: test creating and modifying connections

    // TODO: test offline usage. Requires some way to simulate offline mode

    test("Change note color", async ({ page, browser }) => {
        const board = await navigateToNewBoard(page, browser)
        const monoids = await board.createNoteWithText(100, 200, "Monoids")
        const colorsAndShapes = await board.contextMenu.openColorsAndShapes()
        await colorsAndShapes.selectColor("pink")
        await board.assertItemColor(monoids, "rgb(253, 196, 231)")
    })

    test.describe("Duplicate items", () => {
        test("Duplicate text by Ctrl+D", async ({ page, browser }) => {
            const board = await navigateToNewBoard(page, browser)
            const monoids = await board.createText(100, 200, "Monoids")
            const functors = await board.createNoteWithText(300, 200, "Functors")
            await board.selectItems(monoids, functors)
            await monoids.press("Control+d")
            await expect(monoids).toHaveCount(2)
            await expect(functors).toHaveCount(2)
        })

        test("Duplicate a container with child items", async ({ page, browser }) => {
            const board = await navigateToNewBoard(page, browser)
            const container = await board.createArea(100, 200, "Container")
            const text = await board.createText(150, 250, "text")
            await board.selectItems(container)
            await container.press("Control+d")
            const clonedText = board.getText("text").nth(1)
            await expect(clonedText).toHaveText("text")
        })

        test("Duplicate deeper hierarchy", async ({ page, browser }) => {
            const board = await navigateToNewBoard(page, browser)
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

    test.skip("Copy, paste and cut", async ({ page, browser }) => {
        // TODO: not sure how to trigger native copy, paste events
        const board = await navigateToNewBoard(page, browser)
        const monoids = await board.createNoteWithText(100, 200, "Monoids")
        await page.keyboard.press("Control+c", {})
        await board.clickOnBoard({ x: 500, y: 300 })
        await page.keyboard.press("Control+v")

        await board.changeItemText(board.getNote("Monoids"), "Monads")
        await expect(board.getNote("Monoids")).toBeVisible()
        await expect(board.getNote("Monads")).toBeVisible()
    })

    test("Move items with arrow keys", async ({ page, browser }) => {
        const board = await navigateToNewBoard(page, browser)
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

    test("Delete notes", async ({ page, browser }) => {
        const board = await navigateToNewBoard(page, browser)
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

    test("Align notes", async ({ page, browser }) => {
        const board = await navigateToNewBoard(page, browser)
        const n1 = await board.createNoteWithText(250, 120, "ALIGN")
        const n2 = await board.createNoteWithText(450, 100, "ALL")
        const n3 = await board.createNoteWithText(320, 250, "THESE")
        await board.createNoteWithText(300, 450, "BUT NOT THIS")
        await board.selectItems(n1, n2, n3)
        const originalCoordinates = await Promise.all([n1, n2, n3].map((n) => board.getItemPosition(n)))
        await (await board.contextMenu.openHorizontalAlign()).left.click()
        const newCoordinates = await Promise.all([n1, n2, n3].map((n) => board.getItemPosition(n)))
        const expectedX = originalCoordinates[0].x
        for (let i = 1; i < newCoordinates.length; i++) {
            expect(newCoordinates[i].x).toEqual(expectedX)
        }
    })

    test("Edit note text", async ({ page, browser }) => {
        const board = await navigateToNewBoard(page, browser)
        const monoids = await board.createNoteWithText(100, 200, "Monoids")
        const semigroups = await board.createNoteWithText(200, 200, "Semigroups")

        await test.step("Change text", async () => {
            await board.changeItemText(board.getNote("Monoids"), "Monads")
            await expect(board.getNote("Monads")).toBeVisible()
        })

        await test.step("Check persistence", async () => {
            await sleep(1000) // Time for persistence
            await page.reload()
            await expect(board.getNote("Monads")).toBeVisible()
            await expect(semigroups).toBeVisible()
        })

        await test.step("Check with new session", async () => {
            const newBoard = await board.openBoardInNewBrowser()
            await newBoard.userInfo.dismiss()
            await expect(newBoard.getNote("Monads")).toBeVisible()
        })
    })

    test("Edit area text", async ({ page, browser }) => {
        const board = await navigateToNewBoard(page, browser)
        const monoids = await board.createArea(100, 200, "Monoids")
        const semigroups = await board.createArea(500, 200, "Semigroups")

        await test.step("Change text", async () => {
            await board.changeItemText(board.getArea("Monoids"), "Monads")
            await expect(board.getArea("Monads")).toBeVisible()
        })

        await test.step("Check persistence", async () => {
            await sleep(1000) // Time for persistence
            await page.reload()
            await expect(board.getArea("Monads")).toBeVisible()
            await expect(semigroups).toBeVisible()
        })

        await test.step("Check with new session", async () => {
            await board.deleteIndexedDb()
            const newBoard = await board.openBoardInNewBrowser()
            await newBoard.userInfo.dismiss()
            await expect(newBoard.getArea("Monads")).toBeVisible()
        })
    })

    test("Hide area contents", async ({ page, browser }) => {
        const board = await navigateToNewBoard(page, browser)
        const area = await board.createArea(100, 200, "Area")
        const text = await board.createNoteWithText(150, 250, "text")
        await board.selectItems(area)
        await board.contextMenu.toggleContentsHidden()
        await expect(text).not.toBeVisible()

        await test.step("Check persistence", async () => {
            await sleep(1000) // Time for persistence
            await page.reload()
            await expect(text).not.toBeVisible()
        })

        await test.step("Check with new session", async () => {
            await board.deleteIndexedDb()
            const newBoard = await board.openBoardInNewBrowser()
            await newBoard.userInfo.dismiss()
            await expect(newBoard.getNote("text")).not.toBeVisible()
        })
    })

    test("Resize notes", async ({ page, browser }) => {
        const board = await navigateToNewBoard(page, browser)
        const monoids = await board.createNoteWithText(100, 200, "Monoids")

        await test.step("Can drag to resize items", async () => {
            await board.selectItems(monoids)
            await board.dragSelectionBottomCorner(550, 550)
            await board.assertItemSize(monoids, 380, 380)
        })
    })

    test("Select notes", async ({ page, browser }) => {
        const board = await navigateToNewBoard(page, browser)
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
    test("Clone the board", async ({ page, browser }) => {
        const board = await navigateToNewBoard(page, browser, "clone this board")
        const semigroups = await board.createArea(500, 200, "Semigroups")
        const functors = await board.createNoteWithText(200, 200, "Functors")
        await board.cloneBoard()
        await board.assertBoardName("clone this board copy")
        await expect(semigroups).toBeVisible()
        await expect(functors).toBeVisible()

        await test.step("Check persistence", async () => {
            await page.reload()
            await expect(semigroups).toBeVisible()
        })

        await test.step("Check with new session", async () => {
            await board.deleteIndexedDb()
            const newBoard = await board.openBoardInNewBrowser()
            await newBoard.userInfo.dismiss()
            await expect(newBoard.getArea("Semigroups")).toBeVisible()
        })
    })
})
