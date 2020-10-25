// Cypress doesn't use a DragEvent but just an Event, so it doesn't have dataTransfer property...

const { isExportDeclaration } = require("typescript")

// https://github.com/cypress-io/cypress/issues/649
const mockDataTransfer = {
    setDragImage: () => null
}

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
        let originalX, originalY;
        cy.get(".postit").contains("Monoids").then(elements => {
            const source = elements[0];
            const { x, y } = source.getBoundingClientRect();
            originalX = x;
            originalY = y;

            // Since our app logic calculates the new position for a post-it based on dragstart position and current client mouse position,
            // This test requires the following: 1. dragstart on source element 2. dragover on board to trigger clientCoordinates change 3. drag on source element
            cy.get(".postit").contains("Monoids")
                .trigger("dragstart", { force: true, dataTransfer: mockDataTransfer })
            
            cy.get(".board").trigger("dragover", { force: true, clientX: x + 100, clientY: y - 100 })
            cy.get(".postit").contains("Monoids").trigger("drag", { force: true })
        })

        cy.get(".postit").contains("Monoids").then(elements => {
            const source = elements[0];
            const { x, y } = source.getBoundingClientRect();
            expect(x).to.be.greaterThan(originalX)
            expect(y).to.be.lessThan(originalY)
        })
    })
})

