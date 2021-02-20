import { ConnectionQuestionSpec } from '../../src/models/quiz';
import { expectRevealedCluesToBe, answersHistory, scoreboard, answerInput, answerSubmit } from '../pages/quizPage';
import { CreateConnectionOrSequenceQuestionResult } from '../plugins';

describe('Playing a connection question', () => {
    let quizId: string;
    let teamId: string;
    let questionId: string;
    let clueIds: string[];
    beforeEach(() => {
        cy.login();
        cy.task<string>('createQuiz', {
            quizName: 'Test Quiz',
            passcode: 'itsasecret',
            ownerId: 'owneruid',
        }).then((id) => {
            quizId = id;

            const question: ConnectionQuestionSpec = {
                type: 'connection',
                answerLimit: null,
                clues: [
                    { answerLimit: 1, text: 'Q1 C1', type: 'text' },
                    { answerLimit: 1, text: 'Q1 C2', type: 'text' },
                    { answerLimit: 1, text: 'Q1 C3', type: 'text' },
                    { answerLimit: 1, text: 'Q1 C4', type: 'text' },
                ],
                connection: 'Q1 Conn',
            };
            return cy.task<CreateConnectionOrSequenceQuestionResult>('createConnectionOrSequenceQuestion', {
                quizId,
                question,
            });
        }).then((ids) => {
            questionId = ids.questionId;
            clueIds = ids.clueIds;

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
    
            // Owner shows first clue
            cy.task('revealNextClue', { quizId, nextClueId: clueIds[0] });
            expectRevealedCluesToBe(['Q1 C1']);
            
            // Captain submits answer
            cy.task('submitAnswer', { quizId, questionId, clueId: clueIds[0], teamId, text: 'First answer' })
                .then((id) => cy.wrap(id).as('answerId'));
            answersHistory().contains('Question 1');
            answersHistory().contains('First answer (unscored)');
    
            // Owner marks answer incorrect
            cy.get('@answerId').then((answerId) => {
                cy.task('updateAnswers', { quizId, answerUpdates: [{answerId, correct: false, score: 0}] });
            });
            answersHistory().contains('First answer (0)');
            scoreboard().contains('Universally Challenged: 0');
    
            // Owner shows second clue
            cy.task('revealNextClue', { quizId, nextClueId: clueIds[1], currentClueId: clueIds[0] });
            expectRevealedCluesToBe(['Q1 C1', 'Q1 C2']);
            
            // Captain submits answer at clue 2
            cy.task('submitAnswer', { quizId, questionId, clueId: clueIds[1], teamId, text: 'Second answer' })
                .then((id) => cy.wrap(id).as('answerId'));
            answersHistory().contains('Second answer (unscored)');
    
            // Owner shows third and fourth clue
            cy.task('revealNextClue', { quizId, nextClueId: clueIds[2], currentClueId: clueIds[1] });
            cy.task('revealNextClue', { quizId, nextClueId: clueIds[3], currentClueId: clueIds[2] });
            expectRevealedCluesToBe(['Q1 C1', 'Q1 C2', 'Q1 C3', 'Q1 C4']);
    
            // Owner marks answer at clue 2 correct
            cy.get('@answerId').then((answerId) => {
                cy.task('updateAnswers', { quizId, answerUpdates: [{answerId, teamId, correct: true, score: 4}] });
            });
            answersHistory().contains('Second answer (4)');
            scoreboard().contains('Universally Challenged: 4');
        });
    });

    describe('as team captain', () => {
        beforeEach(() => {
            cy.callFirestore('update', `/teams/${teamId}`, { captainId: Cypress.env('TEST_UID') });
        });

        function submitAnswer(answer) {
            answerInput().should('not.be.disabled');
            answerSubmit().should('not.be.disabled');
            answerInput().type(answer);
            answerSubmit().click();
            answersHistory().contains(`${answer} (unscored)`);
            answerInput().should('be.disabled');
            answerSubmit().should('be.disabled');
        }

        it('allows one answer to be submitted for each clue', () => {
            answerInput().should('be.disabled');
            answerSubmit().should('be.disabled');

            // Clue 1
            cy.task('revealNextClue', { quizId, nextClueId: clueIds[0] });
            submitAnswer('A1');

            // Clue 2
            cy.task('revealNextClue', { quizId, nextClueId: clueIds[1], currentClueId: clueIds[0] });
            submitAnswer('A2');

            // Clue 3
            cy.task('revealNextClue', { quizId, nextClueId: clueIds[2], currentClueId: clueIds[1] });
            submitAnswer('A3');

            // Clue 4
            cy.task('revealNextClue', { quizId, nextClueId: clueIds[3], currentClueId: clueIds[2] });
            submitAnswer('A4');
        });
    });
});