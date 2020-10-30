// Cypress doesn't use a DragEvent but just an Event, so it doesn't have dataTransfer property...
// https://github.com/cypress-io/cypress/issues/649
const mockDataTransfer = {
    setDragImage: () => null
}

const BACKSPACE = 8;

const PostitWithText = text => cy.get('.postit-existing[draggable=true]').contains(text).parents('.postit-existing[draggable=true]').first()
const getPostitsWithTextAndDo = (text, cb) => cy.get('.postit-existing[draggable=true]').then(els => {
    cb([...els].filter(el => el.innerText.includes(text)))
})
const getAllPostitsAndDo = cb => cy.get('.postit-existing[draggable=true]').then(cb)
const getSelectedPostitsAndDo = cb => cy.get('.postit-existing[draggable=true].selected').then(cb)

describe("Initial screen", () => {
    it('Opens correctly', () => {
        cy.visit("http://localhost:1337")
        cy.get("h1#app-title").contains("R-Board").should("be.visible")
    })

    it('Navigating to example board works via link', () => {
        cy.visit("http://localhost:1337")
        cy.get("a").contains("Example Board").click()
        
        cy.url().should("eq", "http://localhost:1337/b/default")
        
        cy.get("h1#board-name").contains("Test Board").should("be.visible")
    })

    it('Creating new board works', () => {
        cy.visit("http://localhost:1337")
        cy.get('input[placeholder="Enter board name"').type("ReaktorIsTheBest")
        cy.get("button").contains("Create").click()
        
        cy.url().should("contain", "http://localhost:1337/b/")
        cy.get("h1#board-name").contains("ReaktorIsTheBest").should("be.visible")
    })
})

describe("Example board - basic functionality", () => {
    it("Opens correctly from direct link", () => {
        cy.visit("http://localhost:1337/b/default")
        cy.get("h1#board-name").contains("Test Board").should("be.visible")
    })

    it("Can edit post-it text", () => {
        cy.visit("http://localhost:1337/b/default")
        cy.get(".text").contains("Hello").type("Monoids")
        cy.get(".postit").contains("Monoids").should("be.visible")
        cy.get(".postit").contains("Hello").should("not.be.visible")
    })

    it("Persists changes", () => {
        cy.visit("http://localhost:1337/b/default")
        cy.get(".postit").contains("Monoids").should("be.visible")
        cy.get(".postit").contains("Hello").should("not.be.visible")
    })

    it("Can drag post it", () => {
        cy.visit("http://localhost:1337/b/default")
        let originalX, originalY
        const monoidsPostit = () => cy.get('.postit-existing[draggable=true]').contains("Monoids").parents('.postit-existing[draggable=true]')
        PostitWithText("Monoids").then(elements => {
            const source = elements[0]
            const { x, y } = source.getBoundingClientRect()
            originalX = x
            originalY = y

            // Since our app logic calculates the new position for a post-it based on dragstart position and current client mouse position,
            // This test requires the following: 1. dragstart on source element 2. dragover on board to trigger clientCoordinates change 3. drag on source element
            PostitWithText("Monoids")
                .trigger("dragstart", { force: true, dataTransfer: mockDataTransfer })
            
            cy.get(".board").trigger("dragover", { force: true, clientX: x + 100, clientY: y - 100 })
            PostitWithText("Monoids").trigger("drag", { force: true })
        })

        PostitWithText("Monoids").then(elements => {
            const source = elements[0]
            const { x, y } = source.getBoundingClientRect()
            expect(x, "Postit 'Monoids' should have moved to the right").to.be.greaterThan(originalX)
            expect(y, "Postit 'Monoids' should have moved upward").to.be.lessThan(originalY)
        })
    })

    it("Can drag multiple post its", () => {
        cy.visit("http://localhost:1337/b/default")
        let originalX, originalY, originalX2, originalY2;
        PostitWithText("World").then(elements => {
            const source = elements[0]
            const { x, y } = source.getBoundingClientRect()
            originalX2 = x
            originalY2 = y
        })
        PostitWithText("Monoids").then(elements => {
            const source = elements[0]
            const { x, y } = source.getBoundingClientRect()
            originalX = x
            originalY = y

            PostitWithText("Monoids").click({ force: true, shiftKey: true })
            PostitWithText("World").click({ force: true, shiftKey: true })

            PostitWithText("Monoids")
                .trigger("dragstart", { force: true, dataTransfer: mockDataTransfer })

            cy.get(".board").trigger("dragover", { force: true, clientX: x - 100, clientY: y + 100 })
            PostitWithText("Monoids").trigger("drag", { force: true })
        })

        PostitWithText("Monoids").then(elements => {
            const source = elements[0]
            const { x, y } = source.getBoundingClientRect()
            expect(x, "Postit 'Monoids' should have moved to the left").to.be.lessThan(originalX)
            expect(y, "Postit 'Monoids' should have moved downward").to.be.greaterThan(originalY)
        })

        PostitWithText("World").then(elements => {
            const source = elements[0]
            const { x, y } = source.getBoundingClientRect()
            expect(x, "Postit 'World' should have moved to the left").to.be.lessThan(originalX2)
            expect(y, "Postit 'World' should have moved downward").to.be.greaterThan(originalY2)
        })
    })

    it("Can drag-to-resize post-it", () => {
        cy.visit("http://localhost:1337/b/default")
        let originalWidth, originalHeight
        PostitWithText("Monoids").then(elements => {
            const source = elements[0]
            const { x, y, width, height } = source.getBoundingClientRect()
            originalWidth = width
            originalHeight = height
            PostitWithText("Monoids").click({ force: true })
            PostitWithText("Monoids").get(".corner-drag.bottom.right").trigger("dragstart", { force: true, dataTransfer: mockDataTransfer })
            cy.get(".board").trigger("dragover", { force: true, clientX: x + 200, clientY: y + 200 })
            PostitWithText("Monoids").get(".corner-drag.bottom.right").trigger("drag", { force: true })
        })

        PostitWithText("Monoids").then(elements => {
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

            PostitWithText("HELLO").should("exist")
        })
    })

    it("Can change color of existing post-it from right click context menu", () => {
        let originalColor;
        PostitWithText("HELLO").then(els => {
            originalColor = els[0].style.background
            expect(originalColor).not.to.equal(undefined)
        })

        PostitWithText("HELLO").rightclick({ force: true })
        cy.get(".context-menu").should("be.visible")
        cy.get(".context-menu").find(".template").then(elements => {
            const templateWithNewColor = [...elements].find(el => el.style.background && el.style.background !== originalColor)
            const newColor = templateWithNewColor.style.background

            templateWithNewColor.click()
            PostitWithText("HELLO").then(els => {
                expect(els[0].style.background, `Postit 'HELLO' should have turned ${newColor}`).to.equal(newColor)
            })

            cy.get(".context-menu").should("not.be.visible")
        })
    })

    it("Can cut, copy and paste post-it", () => {
        PostitWithText("HELLO").click({ force: true }).trigger("cut", { force: true })

        cy.contains("HELLO").should("not.exist")

        cy.get(".board").trigger("paste", { force: true })
        
        getPostitsWithTextAndDo("HELLO", els => {
            expect(els.length, "One postit matching substring 'HELLO' should exist").to.equal(1)
            expect(els[0].innerText, "Postit 'HELLO' should exist").to.equal("HELLO")
        })
        
        getSelectedPostitsAndDo(els => {
            expect(els.length, "One postit should be selected after cut").to.equal(1)
            expect(els[0].innerText, "Postit 'HELLO' should be selected after cut").to.equal("HELLO")
        })

        PostitWithText("HELLO").click({ force: true }).trigger("copy", { force: true }).trigger("paste", { force: true })

        getPostitsWithTextAndDo("HELLO", els => {
            expect(els.length, "Two postits matching substring 'HELLO' should exist").to.equal(2)
        })

        getSelectedPostitsAndDo(els => {
            expect(els.length, "One postit should be selected after copy").to.equal(1)
            expect(els[0].innerText, "Postit 'HELLO' should be selected after copy").to.equal("HELLO")
        })


    })

    it("Can delete post-its", () => {
        cy.visit("http://localhost:1337/b/default")
        PostitWithText("Monoids").click({ force: true, shiftKey: true })
        PostitWithText("World").click({ force: true, shiftKey: true }).trigger("keyup", { keyCode: BACKSPACE, which: BACKSPACE })

        cy.get('.postit-existing[draggable=true]').contains("Monoids").should("not.exist")
        cy.get('.postit-existing[draggable=true]').contains("World").should("not.exist")
    })
})

