import { expect, test } from "@playwright/test"
import { navigateToBoard, navigateToNewBoard, semiUniqueId } from "../pages/BoardPage"

test.describe("Two simultaneous users", () => {
    test("two anonymous users can see each other notes", async ({ page, browser }) => {
        const userPage = await navigateToNewBoard(page, "Collab test board")

        const boardId = userPage.getBoardId()
        const anotherUserPage = await navigateToBoard(await (await browser.newContext()).newPage(), boardId)

        await userPage.userInfo.dismiss()
        await anotherUserPage.userInfo.dismiss()

        // create 2 notes, one on each page
        const userPageNoteText = `note-${semiUniqueId()}`
        await userPage.createNoteWithText(100, 200, userPageNoteText)
        const anotherUserPageNoteText = `another-${semiUniqueId()}`
        await anotherUserPage.createNoteWithText(500, 200, anotherUserPageNoteText)

        await expect(anotherUserPage.getNote(userPageNoteText)).toBeVisible()
        await expect(userPage.getNote(anotherUserPageNoteText)).toBeVisible()
    })
})
