import { Browser, Page, expect, test } from "@playwright/test"
import { navigateToNewBoard, semiUniqueId } from "../pages/BoardPage"

test.describe("Two simultaneous users", () => {
    test("two anonymous users can see each other notes", async ({ page, browser }) => {
        const { user1Page: userPage, user2Page } = await createBoardWithTwoUsers(page, browser)
        // create 2 notes, one on each page
        const userPageNoteText = `note-${semiUniqueId()}`
        await userPage.createNoteWithText(100, 200, userPageNoteText)
        const anotherUserPageNoteText = `another-${semiUniqueId()}`
        await user2Page.createNoteWithText(500, 200, anotherUserPageNoteText)

        await expect(user2Page.getNote(userPageNoteText)).toBeVisible()
        await expect(userPage.getNote(anotherUserPageNoteText)).toBeVisible()
    })

    const onTopPart = { position: { x: 9, y: 15 } } as const

    test("users can collaboratively edit a text area", async ({ page, browser }) => {
        const { user1Page, user2Page } = await createBoardWithTwoUsers(page, browser)
        await user1Page.createArea(100, 200, "initialText")
        await test.step("Both users edit text", async () => {
            await user1Page.getArea("initialText").click(onTopPart)
            await user2Page.getArea("initialText").press("ArrowDown")
            await user1Page.getArea("initialText").pressSequentially("User1Text")
            await user2Page.getArea("initialText").dblclick(onTopPart)
            await user2Page.getArea("initialText").press("ArrowDown")
            await user2Page.getArea("initialText").pressSequentially("User2Text")
            await expect(user1Page.getArea("User1Text")).toBeVisible()
            await expect(user2Page.getArea("User1Text")).toBeVisible()
            await expect(user1Page.getArea("User2Text")).toBeVisible()
            await expect(user2Page.getArea("User2Text")).toBeVisible()
        })
        await test.step("User 1 duplicates text area", async () => {
            await user1Page.cloneButton.click()
        })
        await test.step("Text changes to new area do not affect old area", async () => {
            const oldArea = user1Page.getArea("User2Text").first()
            const newArea = user1Page.getArea("User2Text").last()
            await newArea.press("Escape")
            await user1Page.dragItem(newArea, 300, 300)
            await newArea.dblclick(onTopPart)
            await newArea.press("ArrowDown")
            await newArea.pressSequentially("NewText")
            await expect(newArea).toContainText("NewText")
            await user1Page.assertSelected(newArea, true)
            await newArea.press("Escape")
            await newArea.press("Escape")
            await user1Page.assertSelected(newArea, false)
            await expect(oldArea).not.toContainText("NewText")
            await expect(user2Page.getArea("NewText")).toBeVisible()
        })
        await test.step("Deleting the new area does not affect the old area", async () => {
            const newAreaUser2 = user2Page.getArea("NewText")
            await user2Page.assertSelected(newAreaUser2, false)
            await user2Page.selectItems(newAreaUser2)
            await newAreaUser2.press("Delete")
            await expect(user2Page.getArea("NewText")).not.toBeVisible()
            await expect(user1Page.getArea("NewText")).not.toBeVisible()
            await expect(user2Page.getArea("User2Text")).toBeVisible()
            await expect(user1Page.getArea("User2Text")).toBeVisible()
        })
    })

    async function createBoardWithTwoUsers(page: Page, browser: Browser) {
        const user1Page = await navigateToNewBoard(page, browser, "Collab test board")

        const boardId = user1Page.getBoardId()
        const user2Page = await user1Page.openBoardInNewBrowser()

        await user1Page.userInfo.dismiss()
        await user2Page.userInfo.dismiss()

        return { user1Page, user2Page, boardId }
    }
})
