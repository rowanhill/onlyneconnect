export const answerInput = () => cy.get('[data-cy^="answer-text"]');
export const answerSubmit = () => cy.get('[data-cy="answer-submit"]');
export const revealedClues = () => cy.get('[data-cy^="revealed-clue"]');
export const unrevealedClues = () => cy.get('[data-cy^="unrevealed-clue"]');
export const finalClue = () => cy.get('[data-cy="last-clue"]');
export const answersHistory = () => cy.get('[data-cy="answers-history"]');
export const submittedAnswerSelector = (id) => `[data-cy="submitted-answer-${id}"]`;
export const submittedAnswer = (id) => cy.get(submittedAnswerSelector(id));
export const markAnswerCorrectButton = (id) => cy.get(`${submittedAnswerSelector(id)} button:contains('✔️')`);
export const markAnswerIncorrectButton = (id) => cy.get(`${submittedAnswerSelector(id)} button:contains('❌')`);
export const markAnswerConnectionCorrectButton = (answerId, connection) => cy.get(`[data-cy="submitted-answer-${answerId}-connection-${connection}"] button:contains('✔️')`);
export const markAnswerConnectionIncorrectButton = (answerId, connection) => cy.get(`[data-cy="submitted-answer-${answerId}-connection-${connection}"] button:contains('❌')`);
export const scoreboard = () => cy.get('[data-cy="scoreboard"]');
export const quizControls = () => cy.get('[data-cy="quiz-controls"]');

export const expectRevealedCluesToBe = (clueTexts: string[]) => revealedClues().should(($clues) => {
    const texts = $clues.map((_, el) => Cypress.$(el).text());
    expect(texts.get()).to.deep.equal(clueTexts);
});
export const expectUnrevealedCluesToBe = (clueTexts: string[]) => unrevealedClues().should(($clues) => {
    const texts = $clues.map((_, el) => Cypress.$(el).text());
    expect(texts.get()).to.deep.equal(clueTexts);
});