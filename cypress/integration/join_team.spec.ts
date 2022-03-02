describe('Join a team page', () => {
    let quizId: string;
    let teamId: string;
    beforeEach(() => {
        cy.login();
        cy.callFirestore('delete', 'teams', { recursive: true });
        cy.callFirestore('delete', 'teamSecrets', { recursive: true });
        cy.callFirestore('delete', 'playerTeams', { recursive: true });
        cy.task<string>('createQuiz', {
            quizName: 'Test Quiz',
            passcode: 'itsasecret',
            ownerId: 'owneruid',
        }).then(function (id) {
            quizId = id;
            return cy.task<string>('createTeam', {
                quizId,
                quizPasscode: 'itsasecret',
                teamName: 'Universally Challenged',
                teamPasscode: 'opensesame',
                captainId: 'someotheruid',
                requireTeamPasscode: true,
            });
        })
        .then(function (id) {
            teamId = id;
            cy.visit(`/team/${teamId}/join-team`);
        });
    });

    it('allows users who know the team passcode to join up', () => {
        cy.contains('Universally Challenged');
        cy.get('[data-cy="passcode"]').type('opensesame');
        cy.get('[data-cy="submit"]').click();

        cy.url().should('match', new RegExp(`/quiz/${quizId}$`));
    });

    it('allows users to join up without a passcode if not passcode is required', () => {
        cy.callFirestore('update', `teamSecrets/${teamId}`, { passcode: null });
        cy.callFirestore('update', `teams/${teamId}`, { requireTeamPasscode: false });

        cy.contains('Universally Challenged');
        cy.get('[data-cy="passcode"]').should('not.exist');
        cy.get('[data-cy="submit"]').click();

        cy.url().should('match', new RegExp(`/quiz/${quizId}$`));
    });

    it('disallows joining up if the user doesn\'t have the right passcode', () => {
        cy.get('[data-cy="passcode"]').type('wrong code');
        cy.get('[data-cy="submit"]').click();

        cy.contains('Something went wrong');
        cy.get('[data-cy="passcode"]').should('not.be.disabled');
        cy.get('[data-cy="submit"]').should('not.be.disabled');
    });

    it('informs users if they are already a member of the team', () => {
        cy.task('joinPlayerToTeam', { playerId: Cypress.env('TEST_UID'), teamId, teamPasscode: 'opensesame' });

        cy.contains('You\'re already a member of this team');
        cy.contains('go to your quiz');
    });

    it('informs users if they are already a member of a different team', () => {
        cy.task<string>('createTeam', {
            quizId,
            quizPasscode: 'itsasecret',
            teamName: 'Universally Challenged',
            teamPasscode: 'opensesame',
            captainId: 'someotheruid',
        }).then((otherTeamId) => {
            cy.task('joinPlayerToTeam', { playerId: Cypress.env('TEST_UID'), teamId: otherTeamId, teamPasscode: 'opensesame' });
        });

        cy.contains('You\'re already a member of a different team');
    });
});