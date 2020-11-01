// Cypress doesn't use a DragEvent but just an Event, so it doesn't have dataTransfer property...
// https://github.com/cypress-io/cypress/issues/649
const mockDataTransfer = {
    setDragImage: () => null
}

const BACKSPACE = 8;

const NotesWithText = text => cy.get(`[data-test^="note"][data-test*="${text}"]`)
const Notes = () => cy.get(`[data-test^="note"]`)
const SelectedNotes = () => cy.get(`[data-test^="note-selected"]`)
const PaletteNoteWithColor = color => cy.get(`[data-test="palette-new-note-${color}"]`)

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

describe("Example board", () => {
    it("Opens correctly from direct link", () => {
        cy.visit("http://localhost:1337/b/default")
        cy.get('[data-test="board-name"]').contains("Test Board").should("be.visible")
    })
})


function createNote(text, relX, relY, color = "yellow") {
    PaletteNoteWithColor(color).then(elements => {
        const { x, y } = elements[0].getBoundingClientRect()
        PaletteNoteWithColor("yellow").trigger("dragstart", { force: true, dataTransfer: mockDataTransfer })
        cy.get(".board").trigger("dragover", { force: true, clientX: x + relX, clientY: y + relY })
        // Dragging from palette is not shown in realtime, so the event is different here.
        PaletteNoteWithColor("yellow").trigger("dragend", { force: true })

        NotesWithText("HELLO").should("exist")

        cy.get(".text").contains("HELLO").type(text)

        NotesWithText(text).should("exist")

        cy.get(".board").click()
    })
}

describe("Board functionality", () => {
    
    beforeEach(() => {
        cy.viewport("macbook-15")
        cy.visit("http://localhost:1337")
        cy.get('input[placeholder="Enter board name"').type("ReaktorIsTheBest")
        cy.get("button").contains("Create").click()
        
        cy.url().should("contain", "http://localhost:1337/b/")
        
        cy.get('[data-test="board-name"]').contains("ReaktorIsTheBest").should("be.visible")

    })

    it("Can select note by dragging on board", () => {
        createNote("HELLO", 120, 120)
        
        cy.get(".board").then(board => {
            const { x, y } = board[0].getBoundingClientRect()
            cy.get(".board").trigger("dragstart", { force: true, dataTransfer: mockDataTransfer, clientX: x + 10, clientY: y + 10 })
            cy.get(".board").trigger("dragover", { force: true, clientX: x + 600, clientY: y + 300 })
            cy.get(".board").trigger("drag", { force: true, clientX: x + 600, clientY: y + 300 })
    
            SelectedNotes().then(els => {
                expect(els.length, "One note should be selected").to.equal(1)
                expect(els[0].innerText, "Note 'HELLO' should be selected").to.equal("HELLO")
            })            
        })
    })


    it("Can create note by dragging from palette", () => {
        createNote("HELLO", 350, 200)
    })    

    it("Can edit note text", () => {
        createNote("Hello", 350, 200)
        cy.get(".text").contains("Hello").type("Monoids")
        cy.get(".note").contains("Monoids").should("be.visible")
        cy.get(".note").contains("Hello").should("not.be.visible")
    })

    it("Persists changes", () => {
        createNote("Hello", 350, 200)
        cy.get(".text").contains("Hello").type("Monoids")
        cy.reload()
        cy.get(".note").contains("Monoids").should("be.visible")
        cy.get(".note").contains("Hello").should("not.be.visible")
    })

    it("Can drag note", () => {
        createNote("Monoids", 350, 200)        

        let originalX, originalY
        NotesWithText("Monoids").then(elements => {
            const source = elements[0]
            const { x, y } = source.getBoundingClientRect()
            originalX = x
            originalY = y

            // Since our app logic calculates the new position for a note based on dragstart position and current client mouse position,
            // This test requires the following: 1. dragstart on source element 2. dragover on board to trigger clientCoordinates change 3. drag on source element
            NotesWithText("Monoids")
                .click({ force: true }).trigger("dragstart", { force: true, dataTransfer: mockDataTransfer })
            
            cy.get(".board").trigger("dragover", { force: true, clientX: x + 100, clientY: y - 100 })
            NotesWithText("Monoids").trigger("drag", { force: true })
        })

        NotesWithText("Monoids").then(elements => {
            const source = elements[0]
            const { x, y } = source.getBoundingClientRect()
            expect(x, "Note 'Monoids' should have moved to the right").to.be.greaterThan(originalX)
            expect(y, "Note 'Monoids' should have moved upward").to.be.lessThan(originalY)
        })
    })

    it("Can drag multiple notes", () => {
        createNote("World", 200, 200)    
        createNote("Monoids", 250, 200)    
        let originalX, originalY, originalX2, originalY2;
        NotesWithText("World").then(elements => {
            const source = elements[0]
            const { x, y } = source.getBoundingClientRect()
            originalX2 = x
            originalY2 = y
        })
        NotesWithText("Monoids").then(elements => {
            const source = elements[0]
            const { x, y } = source.getBoundingClientRect()
            originalX = x
            originalY = y

            NotesWithText("Monoids").click({ force: true, shiftKey: true })
            NotesWithText("World").click({ force: true, shiftKey: true })

            NotesWithText("Monoids")
                .click({ force: true }).trigger("dragstart", { force: true, dataTransfer: mockDataTransfer })

            cy.get(".board").trigger("dragover", { force: true, clientX: x - 100, clientY: y + 100 })
            NotesWithText("Monoids").trigger("drag", { force: true })
        })

        NotesWithText("Monoids").then(elements => {
            const source = elements[0]
            const { x, y } = source.getBoundingClientRect()
            expect(x, "Note 'Monoids' should have moved to the left").to.be.lessThan(originalX)
            expect(y, "Note 'Monoids' should have moved downward").to.be.greaterThan(originalY)
        })

        NotesWithText("World").then(elements => {
            const source = elements[0]
            const { x, y } = source.getBoundingClientRect()
            expect(x, "Note 'World' should have moved to the left").to.be.lessThan(originalX2)
            expect(y, "Note 'World' should have moved downward").to.be.greaterThan(originalY2)
        })
    })

    it("Can drag-to-resize note", () => {
        createNote("Monoids", 250, 200)   

        let originalWidth, originalHeight
        NotesWithText("Monoids").then(elements => {
            const source = elements[0]
            const { x, y, width, height } = source.getBoundingClientRect()
            originalWidth = width
            originalHeight = height
            NotesWithText("Monoids").click({ force: true })
            NotesWithText("Monoids").get(".corner-drag.bottom.right").trigger("dragstart", { force: true, dataTransfer: mockDataTransfer })
            cy.get(".board").trigger("dragover", { force: true, clientX: x + 200, clientY: y + 200 })
            NotesWithText("Monoids").get(".corner-drag.bottom.right").trigger("drag", { force: true })
        })

        NotesWithText("Monoids").then(elements => {
            const source = elements[0]
            const { width, height } = source.getBoundingClientRect()
            expect(width, "Note 'Monoids' width should have increased").to.be.greaterThan(originalWidth)
            expect(height, "Note 'Monoids' height should have increased").to.be.greaterThan(originalHeight)
        })
    })

    it("Can change color of existing note from right click context menu", () => {
        createNote("HELLO", 250, 200)  
        let originalColor;
        NotesWithText("HELLO").then(els => {
            originalColor = els[0].style.background
            expect(originalColor).not.to.equal(undefined)
        })

        NotesWithText("HELLO").rightclick({ force: true })
        cy.get(".context-menu").should("be.visible")
        cy.get(".context-menu").find(".template").then(elements => {
            const templateWithNewColor = [...elements].find(el => el.style.background && el.style.background !== originalColor)
            const newColor = templateWithNewColor.style.background

            templateWithNewColor.click()
            NotesWithText("HELLO").then(els => {
                expect(els[0].style.background, `Note 'HELLO' should have turned ${newColor}`).to.equal(newColor)
            })

            cy.get(".context-menu").should("not.be.visible")
        })
    })

    it("Can cut, copy and paste note", () => {
        createNote("HELLO", 250, 200)  
        NotesWithText("HELLO").click({ force: true }).trigger("cut", { force: true })

        cy.contains("HELLO").should("not.exist")

        cy.get(".board").trigger("paste", { force: true })
        
        NotesWithText("HELLO").then(els => {
            expect(els.length, "One note with text 'HELLO' should exist").to.equal(1)
        })
        
        SelectedNotes().then(els => {
            expect(els.length, "One note should be selected after cut").to.equal(1)
            expect(els[0].innerText, "Note 'HELLO' should be selected after cut").to.equal("HELLO")
        })

        NotesWithText("HELLO").click({ force: true }).trigger("copy", { force: true }).trigger("paste", { force: true })

        NotesWithText("HELLO").then(els => {
            expect(els.length, "Two notes with text 'HELLO' should exist").to.equal(2)
        })

        SelectedNotes().then(els => {
            expect(els.length, "One note should be selected after copy").to.equal(1)
            expect(els[0].innerText, "Note 'HELLO' should be selected after copy").to.equal("HELLO")
        })


    })

    it("Can delete notes", () => {
        createNote("Monoids", 250, 200)  
        createNote("World", 150, 200)  
        NotesWithText("Monoids").click({ force: true, shiftKey: true })
        NotesWithText("World").click({ force: true, shiftKey: true })
        NotesWithText("World").trigger("keyup", { keyCode: BACKSPACE, which: BACKSPACE })

        NotesWithText("Monoids").should("not.exist")
        NotesWithText("World").should("not.exist")
    })
})

