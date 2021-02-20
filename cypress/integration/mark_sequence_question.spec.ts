import { SequenceQuestionSpec } from '../../src/models/quiz';
import { submittedAnswer } from '../pages/quizPage';
import { CreateConnectionOrSequenceQuestionResult } from '../plugins';

describe('Marking a connection question', () => {
    let quizId: string;
    let teamId: string;
    let questionId: string;
    let clueIds: string[];
    beforeEach(() => {
        cy.login();
        cy.task<string>('createQuiz', {
            quizName: 'Test Quiz',
            passcode: 'itsasecret',
            ownerId: Cypress.env('TEST_UID'),
        }).then((id) => {
            quizId = id;

            const question: SequenceQuestionSpec = {
                type: 'sequence',
                answerLimit: null,
                clues: [
                    { answerLimit: 1, text: 'Q1 C1', type: 'text' },
                    { answerLimit: 1, text: 'Q1 C2', type: 'text' },
                    { answerLimit: 1, text: 'Q1 C3', type: 'text' },
                ],
                connection: 'Q1 Conn',
                exampleLastInSequence: 'Q1 C4 ex',
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

            // Reveal the question
            cy.task('revealNextQuestion', { quizId, nextQuestionId: questionId });
        })
        .then(() => {
            cy.visit(`/quiz/${quizId}`);
        });
    });

    function submitAnswer(clueId, text) {
        return cy.task('submitAnswer', {
            quizId,
            questionId,
            clueId,
            teamId,
            text,
        });
    }

    it('allows answers to be marked correct or incorrect, disabling invalid actions', () => {
        // Show the first clue
        cy.task('revealNextClue', { quizId, nextClueId: clueIds[0] });

        // A team captain submits an answer
        submitAnswer(clueIds[0], 'Answer text').then((id) => cy.wrap(id).as('firstAnswerId'));

        cy.get('@firstAnswerId').then((answerId) => {
            // Can mark either correct or incorrect at first
            submittedAnswer(answerId).contains('✔️').should('not.be.disabled');
            submittedAnswer(answerId).contains('❌').should('not.be.disabled');

            // Mark correct - then can only mark incorrect
            submittedAnswer(answerId).contains('✔️').click();
            submittedAnswer(answerId).contains('✔️').should('be.disabled');
            submittedAnswer(answerId).contains('❌').should('not.be.disabled');

            // Mark incorrect - then can only mark correct
            submittedAnswer(answerId).contains('❌').click();
            submittedAnswer(answerId).contains('❌').should('be.disabled');
            submittedAnswer(answerId).contains('✔️').should('not.be.disabled');
        });

        // Second clue is shown, team captain submits another answer
        cy.task('revealNextClue', { quizId, nextClueId: clueIds[1], currentClueId: clueIds[0] });
        submitAnswer(clueIds[1], 'Answer text 2').then((id) => cy.wrap(id).as('secondAnswerId'));

        // New answer can be marked either correct or incorrect at first
        cy.get('@secondAnswerId').then((answerId) => {
            submittedAnswer(answerId).contains('✔️').should('not.be.disabled');
            submittedAnswer(answerId).contains('❌').should('not.be.disabled');
        });

        // Marks first answer correct, second answer buttons go away
        cy.get('@firstAnswerId').then((answerId) => {
            submittedAnswer(answerId).contains('✔️').click();
        });
        cy.get('@secondAnswerId').then((answerId) => {
            submittedAnswer(answerId).contains('✔️').should('not.exist');
            submittedAnswer(answerId).contains('❌').should('not.exist');
        });

        // Marks first answer incorrect then second answer correct, first answer buttons go away
        cy.get('@firstAnswerId').then((answerId) => {
            submittedAnswer(answerId).contains('❌').click();
        });
        cy.get('@secondAnswerId').then((answerId) => {
            submittedAnswer(answerId).contains('✔️').click();
        });
        cy.get('@firstAnswerId').then((answerId) => {
            submittedAnswer(answerId).contains('✔️').should('not.exist');
            submittedAnswer(answerId).contains('❌').should('not.exist');
        });
    });
});