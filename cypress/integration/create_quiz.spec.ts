describe('Creating a quiz page', () => {
    beforeEach(() => {
        cy.login();
        cy.visit('/quiz/create');
    });

    it('allows a user to create a new quiz, using a passcode by default', () => {
        cy.get('[data-cy="quiz-name"]').type('Some Quiz');
        cy.get('[data-cy="passcode"]').type('opensesame');
        cy.get('[data-cy="submit"]').click();

        cy.url().should('match', /\/quiz\/.+\/edit$/);

        cy.get('[data-cy="quiz-name"]').should('have.value', 'Some Quiz');
        cy.get('[data-cy="passcode"]').should('have.value', 'opensesame');
    });

    it('allows a user to create a new quiz without a passcode', () => {
        cy.get('[data-cy="quiz-name"]').type('Some Quiz');
        cy.get('[data-cy="use-passcode"]').uncheck();
        cy.get('[data-cy="submit"]').click();

        cy.url().should('match', /\/quiz\/.+\/edit$/);

        cy.get('[data-cy="quiz-name"]').should('have.value', 'Some Quiz');
        cy.get('[data-cy="passcode"]').should('not.exist');
    });
});