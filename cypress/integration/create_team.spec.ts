describe('Creating quiz team page', () => {
    beforeEach(() => {
        cy.login();
        cy.callFirestore('delete', 'quizzes', { recursive: true });
        cy.callFirestore('delete', 'quizSecrets', { recursive: true });
        cy.callFirestore('delete', 'teams', { recursive: true });
        cy.callFirestore('delete', 'teamSecrets', { recursive: true });
        cy.callFirestore('delete', 'playerTeams', { recursive: true });
        cy.callFirestore('set', 'quizzes/abc123', { name: 'Test Quiz', ownerId: 'someotheruid', questionIds: [], requireQuizPasscode: true });
        cy.callFirestore('set', 'quizSecrets/abc123', { passcode: 'itsasecret' });
        cy.visit('/quiz/abc123/create-team');
    });

    it('allows a user to create a new team if the have the quiz passcode', () => {
        cy.get('[data-cy="quiz-passcode"]').type('itsasecret');
        cy.get('[data-cy="team-name"]').type('Universally Challenged');
        cy.get('[data-cy="team-passcode"]').type('opensesame');
        cy.get('[data-cy="submit"]').click();

        cy.url().should('match', /\/quiz\/abc123$/);
        cy.contains('Test Quiz');
        cy.contains('Waiting for quiz to start');
    });

    it('allows a user to create a new team without a quiz password if there is no quiz password', () => {
        cy.callFirestore('update', 'quizzes/abc123', { requireQuizPasscode: false });
        cy.callFirestore('update', 'quizSecrets/abc123', { passcode: null });

        cy.get('[data-cy="team-name"]').type('Universally Challenged');
        cy.get('[data-cy="quiz-passcode"]').should('not.exist');
        cy.get('[data-cy="team-passcode"]').type('opensesame');
        cy.get('[data-cy="submit"]').click();

        cy.url().should('match', /\/quiz\/abc123$/);
        cy.contains('Test Quiz');
        cy.contains('Waiting for quiz to start');
    });

    it('disallows team creation if the quiz passcode is wrong', () => {
        cy.get('[data-cy="quiz-passcode"]').type('wrong passcode');
        cy.get('[data-cy="team-name"]').type('Universally Challenged');
        cy.get('[data-cy="team-passcode"]').type('opensesame');
        cy.get('[data-cy="submit"]').click();

        cy.contains('Something went wrong')
        cy.url().should('not.match', /\/quiz\/abc123$/);

        cy.get('[data-cy="quiz-passcode"]').should('not.be.disabled');
        cy.get('[data-cy="team-name"]').should('not.be.disabled');
        cy.get('[data-cy="submit"]').should('not.be.disabled');
    });

    it('allows creating a team without a team passcode', () => {
        cy.get('[data-cy="quiz-passcode"]').type('itsasecret');
        cy.get('[data-cy="team-name"]').type('Universally Challenged');
        cy.get('[data-cy="use-team-passcode"]').uncheck();
        cy.get('[data-cy="submit"]').click();

        cy.url().should('match', /\/quiz\/abc123$/);
        cy.contains('Test Quiz');
        cy.contains('Waiting for quiz to start');
    });
});