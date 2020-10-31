// Cypress doesn't use a DragEvent but just an Event, so it doesn't have dataTransfer property...
// https://github.com/cypress-io/cypress/issues/649
const mockDataTransfer = {
    setDragImage: () => null
}

const BACKSPACE = 8;

const PostitsWithText = text => cy.get(`[data-test^="postit"][data-test*="${text}"]`)
const Postits = () => cy.get(`[data-test^="postit-"]`)
const SelectedPostits = () => cy.get(`[data-test^="postit-selected-"]`)

describe("Initial screen", () => {
    it('Opens correctly', () => {
        cy.visit("http://localhost:1337")
        cy.get('[data-test="app-title"').contains("R-Board").should("be.visible")
    })

    it('Navigating to example board works via link', () => {
        cy.visit("http://localhost:1337")
        cy.get("a").contains("Example Board").click()
        
        cy.url().should("eq", "http://localhost:1337/b/default")
        
        cy.get('[data-test="board-name"]').contains("Test Board").should("be.visible")
    })

    it('Creating new board works', () => {
        cy.visit("http://localhost:1337")
        cy.get('input[placeholder="Enter board name"').type("ReaktorIsTheBest")
        cy.get("button").contains("Create").click()
        
        cy.url().should("contain", "http://localhost:1337/b/")
        cy.get('[data-test="board-name"]').contains("ReaktorIsTheBest").should("be.visible")
    })
})

describe("Example board - basic functionality", () => {
    it("Opens correctly from direct link", () => {
        cy.visit("http://localhost:1337/b/default")
        cy.get('[data-test="board-name"]').contains("Test Board").should("be.visible")
    })

    it("Can edit post-it text", () => {
        cy.visit("http://localhost:1337/b/default")
        cy.get(".text").contains("Hello").type("Monoids")
        cy.get(".postit").contains("Monoids").should("be.visible")
        cy.get(".postit").contains("Hello").should("not.be.visible")
    })

    it("Persists changes", () => {
        cy.visit("http://localhost:1337/b/default")
        cy.reload()
        cy.get(".postit").contains("Monoids").should("be.visible")
        cy.get(".postit").contains("Hello").should("not.be.visible")
    })

    it("Can drag post it", () => {
        cy.visit("http://localhost:1337/b/default")
        let originalX, originalY
        PostitsWithText("Monoids").then(elements => {
            const source = elements[0]
            const { x, y } = source.getBoundingClientRect()
            originalX = x
            originalY = y

            // Since our app logic calculates the new position for a post-it based on dragstart position and current client mouse position,
            // This test requires the following: 1. dragstart on source element 2. dragover on board to trigger clientCoordinates change 3. drag on source element
            PostitsWithText("Monoids")
                .click({ force: true }).trigger("dragstart", { force: true, dataTransfer: mockDataTransfer })
            
            cy.get(".board").trigger("dragover", { force: true, clientX: x + 100, clientY: y - 100 })
            PostitsWithText("Monoids").trigger("drag", { force: true })
        })

        PostitsWithText("Monoids").then(elements => {
            const source = elements[0]
            const { x, y } = source.getBoundingClientRect()
            expect(x, "Postit 'Monoids' should have moved to the right").to.be.greaterThan(originalX)
            expect(y, "Postit 'Monoids' should have moved upward").to.be.lessThan(originalY)
        })
    })

    it("Can drag multiple post its", () => {
        cy.visit("http://localhost:1337/b/default")
        let originalX, originalY, originalX2, originalY2;
        PostitsWithText("World").then(elements => {
            const source = elements[0]
            const { x, y } = source.getBoundingClientRect()
            originalX2 = x
            originalY2 = y
        })
        PostitsWithText("Monoids").then(elements => {
            const source = elements[0]
            const { x, y } = source.getBoundingClientRect()
            originalX = x
            originalY = y

            PostitsWithText("Monoids").click({ force: true, shiftKey: true })
            PostitsWithText("World").click({ force: true, shiftKey: true })

            PostitsWithText("Monoids")
                .click({ force: true }).trigger("dragstart", { force: true, dataTransfer: mockDataTransfer })

            cy.get(".board").trigger("dragover", { force: true, clientX: x - 100, clientY: y + 100 })
            PostitsWithText("Monoids").trigger("drag", { force: true })
        })

        PostitsWithText("Monoids").then(elements => {
            const source = elements[0]
            const { x, y } = source.getBoundingClientRect()
            expect(x, "Postit 'Monoids' should have moved to the left").to.be.lessThan(originalX)
            expect(y, "Postit 'Monoids' should have moved downward").to.be.greaterThan(originalY)
        })

        PostitsWithText("World").then(elements => {
            const source = elements[0]
            const { x, y } = source.getBoundingClientRect()
            expect(x, "Postit 'World' should have moved to the left").to.be.lessThan(originalX2)
            expect(y, "Postit 'World' should have moved downward").to.be.greaterThan(originalY2)
        })
    })

    it("Can drag-to-resize post-it", () => {
        cy.visit("http://localhost:1337/b/default")
        let originalWidth, originalHeight
        PostitsWithText("Monoids").then(elements => {
            const source = elements[0]
            const { x, y, width, height } = source.getBoundingClientRect()
            originalWidth = width
            originalHeight = height
            PostitsWithText("Monoids").click({ force: true })
            PostitsWithText("Monoids").get(".corner-drag.bottom.right").trigger("dragstart", { force: true, dataTransfer: mockDataTransfer })
            cy.get(".board").trigger("dragover", { force: true, clientX: x + 200, clientY: y + 200 })
            PostitsWithText("Monoids").get(".corner-drag.bottom.right").trigger("drag", { force: true })
        })

        PostitsWithText("Monoids").then(elements => {
            const source = elements[0]
            const { width, height } = source.getBoundingClientRect()
            expect(width, "Postit 'Monoids' width should have increased").to.be.greaterThan(originalWidth)
            expect(height, "Postit 'Monoids' height should have increased").to.be.greaterThan(originalHeight)
        })
    })

    it("Can create post-it by dragging from palette", () => {
        cy.get(".palette-item").then(elements => {
            const { x, y } = elements[0].getBoundingClientRect()
            cy.get(".palette-item").first().trigger("dragstart", { force: true, dataTransfer: mockDataTransfer })
            cy.get(".board").trigger("dragover", { force: true, clientX: x + 300, clientY: y + 300 })
            // Dragging from palette is not shown in realtime, so the event is different here.
            cy.get(".palette-item").first().trigger("dragend", { force: true })

            PostitsWithText("HELLO").should("exist")
        })
    })

    it("Can change color of existing post-it from right click context menu", () => {
        let originalColor;
        PostitsWithText("HELLO").then(els => {
            originalColor = els[0].style.background
            expect(originalColor).not.to.equal(undefined)
        })

        PostitsWithText("HELLO").rightclick({ force: true })
        cy.get(".context-menu").should("be.visible")
        cy.get(".context-menu").find(".template").then(elements => {
            const templateWithNewColor = [...elements].find(el => el.style.background && el.style.background !== originalColor)
            const newColor = templateWithNewColor.style.background

            templateWithNewColor.click()
            PostitsWithText("HELLO").then(els => {
                expect(els[0].style.background, `Postit 'HELLO' should have turned ${newColor}`).to.equal(newColor)
            })

            cy.get(".context-menu").should("not.be.visible")
        })
    })

    it("Can cut, copy and paste post-it", () => {
        PostitsWithText("HELLO").click({ force: true }).trigger("cut", { force: true })

        cy.contains("HELLO").should("not.exist")

        cy.get(".board").trigger("paste", { force: true })
        
        PostitsWithText("HELLO").then(els => {
            expect(els.length, "One postit with text 'HELLO' should exist").to.equal(1)
        })
        
        SelectedPostits().then(els => {
            expect(els.length, "One postit should be selected after cut").to.equal(1)
            expect(els[0].innerText, "Postit 'HELLO' should be selected after cut").to.equal("HELLO")
        })

        PostitsWithText("HELLO").click({ force: true }).trigger("copy", { force: true }).trigger("paste", { force: true })

        PostitsWithText("HELLO").then(els => {
            expect(els.length, "Two postits with text 'HELLO' should exist").to.equal(2)
        })

        SelectedPostits().then(els => {
            expect(els.length, "One postit should be selected after copy").to.equal(1)
            expect(els[0].innerText, "Postit 'HELLO' should be selected after copy").to.equal("HELLO")
        })


    })

    it("Can delete post-its", () => {
        cy.visit("http://localhost:1337/b/default")
        PostitsWithText("Monoids").click({ force: true, shiftKey: true })
        PostitsWithText("World").click({ force: true, shiftKey: true })
        PostitsWithText("World").trigger("keyup", { keyCode: BACKSPACE, which: BACKSPACE })

        PostitsWithText("Monoids").should("not.exist")
        PostitsWithText("World").should("not.exist")
    })
})

