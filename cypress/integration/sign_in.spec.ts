describe('when not signed in', () => {
    beforeEach(() => {
        cy.logout();
    });

    it('redirects the home page to the signin page', () => {
        cy.visit('/');
        assertIsSignInPage();
    });
    it('redirects a quiz page to the signin page', () => {
        cy.visit('/quiz/abcd123');
        assertIsSignInPage();
    });
});

function assertIsSignInPage() {
    cy.url().should('include', 'sign-in');
    cy.contains('Sign in with email');
    cy.get('input').should('have.attr', 'placeholder', 'Email address');
    cy.get('button').contains('Log in');
}