it('works', () => {
    cy.visit("http://localhost:1337")
    cy.get("h1").contains("R-Board")
})