import { MissingVowelsQuestionSpec } from '../../src/models/questionSpec';
import { expectRevealedCluesToBe, answersHistory, scoreboard, answerInput, answerSubmit } from '../pages/quizPage';
import { CreateMissingVowelsOrWallQuestionResult } from '../plugins';

describe('Playing a missing vowels question', () => {
    let quizId: string;
    let teamId: string;
    let questionId: string;
    let clueId: string;
    beforeEach(() => {
        cy.login();
        cy.task<string>('createQuiz', {
            quizName: 'Test Quiz',
            passcode: 'itsasecret',
            ownerId: 'owneruid',
        }).then((id) => {
            quizId = id;

            const question: MissingVowelsQuestionSpec = {
                type: 'missing-vowels',
                answerLimit: 5,
                clue: {
                    answerLimit: null,
                    texts: ['Q1 C1', 'Q1 C2', 'Q1 C3', 'Q1 C4'],
                    solution: ['Q1 C1 S', 'Q1 C2 S', 'Q1 C3 S', 'Q1 C4 S'],
                    type: 'compound-text',
                },
                connection: 'Q1 conn',
            };
            return cy.task<CreateMissingVowelsOrWallQuestionResult>('createMissingVowelsQuestion', {
                quizId,
                question: question,
            });
        }).then((ids) => {
            questionId = ids.questionId;
            clueId = ids.clueId;

            return cy.task<string>('createTeam', {
                quizId,
                quizPasscode: 'itsasecret',
                teamName: 'Universally Challenged',
                teamPasscode: 'opensesame',
                captainId: 'someotheruid',
            });
        })
        .then((id) => {
            teamId = id;
            cy.task('joinPlayerToTeam', {
                playerId: Cypress.env('TEST_UID'),
                teamId,
                teamPasscode: 'opensesame',
            });

            // Reveal the question
            cy.task('revealNextQuestion', { quizId, nextQuestionId: questionId });
        })
        .then(() => {
            cy.visit(`/quiz/${quizId}`);
        });
    });

    describe('as a team member', () => {
        it('shows questions, clues, answers and scores as they are revealed / submitted', () => {
            cy.contains('Waiting for question to start');
            expectRevealedCluesToBe([]);
    
            // Owner shows the clue
            cy.task('revealNextClue', { quizId, nextClueId: clueId });
            expectRevealedCluesToBe(['Q1 C1', 'Q1 C2', 'Q1 C3', 'Q1 C4']);
            
            // Captain submits answer
            cy.task('submitAnswer', { quizId, questionId, clueId, teamId, text: 'First answer' })
                .then((id) => cy.wrap(id).as('answerId'));
            answersHistory().contains('Question 1');
            answersHistory().contains('First answer (unscored)');
    
            // Owner marks answer incorrect
            cy.get('@answerId').then((answerId) => {
                cy.task('updateAnswers', { quizId, answerUpdates: [{answerId, correct: false, score: 0}] });
            });
            answersHistory().contains('First answer (0)');
            scoreboard().contains('Universally Challenged: 0');
            
            // Captain submits another answer
            cy.task('submitAnswer', { quizId, questionId, clueId, teamId, text: 'Second answer' })
                .then((id) => cy.wrap(id).as('answerId'));
            answersHistory().contains('Second answer (unscored)');
    
            // Owner marks answer correct
            cy.get('@answerId').then((answerId) => {
                cy.task('updateAnswers', { quizId, answerUpdates: [{answerId, teamId, correct: true, score: 4}] });
            });
            answersHistory().contains('Second answer (4)');
            scoreboard().contains('Universally Challenged: 4');
        });

        it('shows the connection an solved clues when the question is over', () => {
            cy.task('revealNextClue', { quizId, nextClueId: clueId });
            cy.task('revealAnswer', { quizId, questionId, currentClueId: clueId });

            cy.contains('Q1 conn').should('exist');
            expectRevealedCluesToBe(['Q1 C1 S', 'Q1 C2 S', 'Q1 C3 S', 'Q1 C4 S']);
        });
    });

    describe('as team captain', () => {
        beforeEach(() => {
            cy.callFirestore('update', `/teams/${teamId}`, { captainId: Cypress.env('TEST_UID') });
        });

        it('allows answer submission', () => {
            answerInput().should('be.disabled');
            answerSubmit().should('be.disabled');

            // Owner shows a clue
            cy.task('revealNextClue', { quizId, nextClueId: clueId });
            answerInput().should('not.be.disabled');
            answerSubmit().should('not.be.disabled');

            // User submits answer
            answerInput().type('A1');
            answerSubmit().click();
            answersHistory().contains('A1 (unscored)');
            answerInput().should('not.be.disabled');
            answerSubmit().should('not.be.disabled');

            // User submits four more answers
            answerInput().type('A2');
            answerSubmit().click();
            answerInput().type('A3');
            answerSubmit().click();
            answerInput().type('A4');
            answerSubmit().click();
            answerInput().type('A5');
            answerSubmit().click();
            answerInput().should('be.disabled');
            answerSubmit().should('be.disabled');
        });
    });
});