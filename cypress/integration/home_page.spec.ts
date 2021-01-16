describe('The home page', () => {
    beforeEach(() => {
        cy.callFirestore('delete', 'quizzes', { recursive: true });
        cy.login();
        cy.visit('/');
    });
    it('shows a welcome message invitations to sign out or to create a quiz', () => {
        cy.contains('Onlyne Connect');
        cy.contains('sign out');
        cy.contains('create a new one');
    });

    describe('with pre-existing quizzes', () => {
        const quizTitles = ['Quiz One', 'Quiz Two'];
        beforeEach(() => {
            for (const name of quizTitles) {
                cy.task('createQuiz', { quizName: name, passcode: 'quiz passcode', ownerId: Cypress.env('TEST_UID') });
            }
            cy.task('createQuiz', { quizName: 'Other Quiz', passcode: 'quiz passcode', ownerId: 'anotheruid' });
        });

        it('lists owned quizzes', () => {
            cy.get('ul > li').should('have.length', quizTitles.length);
            for (const name of quizTitles) {
                cy.contains(name);
            }
        });
    });
});