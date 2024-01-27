import { Browser, chromium, expect, test } from "@playwright/test"
import { navigateToBoard, navigateToNewBoard } from "../pages/BoardPage"

test.describe("Two simultaneous users", () => {
    test("two anonymous users can see each other notes", async ({ page, browser }) => {
        const userPage = await navigateToNewBoard(page, "Collab test board")
        await userPage.assertBoardName("Collab test board")

        const boardId = userPage.getBoardId()
        const anotherUserPage = await navigateToBoard(await (await browser.newContext()).newPage(), boardId)

        await userPage.userInfo.dismiss()
        await anotherUserPage.userInfo.dismiss()

        // create 2 notes, one on each page
        const userPageNoteText = `note-${semiUniqueId()}`
        await userPage.createNoteWithText(0, userPageNoteText)
        const anotherUserPageNoteText = `another-${semiUniqueId()}`
        await anotherUserPage.createNoteWithText(500, anotherUserPageNoteText)

        const note = await anotherUserPage.getNote(userPageNoteText)
        const anotherNote = await userPage.getNote(anotherUserPageNoteText)

        expect(note).not.toBeNull()
        expect(anotherNote).not.toBeNull()
    })
})

export const semiUniqueId = () => {
    const now = String(Date.now())
    return now.substring(now.length - 5)
}
