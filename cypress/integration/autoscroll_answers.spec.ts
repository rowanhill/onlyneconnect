import { ConnectionQuestionSpec } from '../../src/models/questionSpec';
import { answersHistory } from '../pages/quizPage';
import { CreateConnectionOrSequenceQuestionResult } from '../plugins';

describe('Autoscrolling of answers history', () => {
    let quizId: string;
    let teamId: string;
    let questionId: string;
    let clueIds: string[];
    let answerIds: string[];
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
                    { answerLimit: 1000, text: 'Q1 C1', type: 'text' },
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

            // Reveal the question & first clue
            cy.task('revealNextQuestion', { quizId, nextQuestionId: questionId })
                .task('revealNextClue', { quizId, nextClueId: clueIds[0] });
            
            const ids = [];
            for (let i = 0; i < 30; i++) {
                submitAnswer(clueIds[0], `Answer ${i + 1}`).then((id) => ids.push(id));
            }
            answerIds = ids;

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

    describe('when autoscrolling is enabled', () => {
        beforeEach(() => {
            cy.contains('Answer 30').scrollIntoView().should('be.visible');
            cy.contains('Answer 1').should('not.be.visible'); // Check first answer has scrolled off the top
        });

        describe('as team member', () => {
            it('autoscrolls when a new answer is submitted', () => {
                submitAnswer(clueIds[0], `New answer`);
                cy.contains('New answer').should('be.visible');
            });
        });

        describe('as team captain', () => {
            beforeEach(() => {
                cy.callFirestore('update', `/teams/${teamId}`, { captainId: Cypress.env('TEST_UID') });
            });

            it('autoscrolls when a new answer is submitted', () => {
                submitAnswer(clueIds[0], `New answer`);
                cy.contains('New answer').should('be.visible');
            });
        });

        describe('as quiz owner', () => {
            beforeEach(() => {
                cy.visit(`about:blank`);
                cy.callFirestore('update', `/quizzes/${quizId}`, { ownerId: Cypress.env('TEST_UID') });
                cy.visit(`/quiz/${quizId}`);
                for (const answerId of answerIds) {
                    cy.callFirestore('update', `/quizzes/${quizId}/answers/${answerId}`, { points: 0, correct: false });
                }
            });

            it('autoscrolls when a new answer is submitted', () => {
                submitAnswer(clueIds[0], `New answer`);
                cy.contains('New answer').should('be.visible');
            });
        });
    });

    describe('when autoscrolling is disabled (by scrolling away)', () => {
        beforeEach(() => {
            cy.contains('Answer 30').scrollIntoView().should('be.visible');
            answersHistory().scrollTo(0, 130);
            cy.contains('Answer 1').should('not.be.visible'); // Check first answer has scrolled off the top
            cy.contains('Answer 30').should('not.be.visible'); // Check last answer has scrolled off the bottom
        });

        describe('as team member', () => {
            it('does not scroll when a new answer is submitted', () => {
                submitAnswer(clueIds[0], `New answer`);

                // Wait for a potential scroll to happen. Obviously, this is very hacky - it would be better to
                // do this without a hard-coded wait, but it's not clear how to achieve this. Even using
                // cy.contains() seems to interrupt Chrome's scrollToElement animation, making it awkward to test
                // visibility without a wait.
                cy.wait(500);
                cy.contains('New answer').should('not.be.visible');
            });
        });

        describe('as team captain', () => {
            beforeEach(() => {
                cy.callFirestore('update', `/teams/${teamId}`, { captainId: Cypress.env('TEST_UID') });
            });

            it('does not scroll when a new answer is submitted', () => {
                // cy.pause();
                submitAnswer(clueIds[0], `New answer`);

                // Wait for a potential scroll to happen. Obviously, this is very hacky - it would be better to
                // do this without a hard-coded wait, but it's not clear how to achieve this. Even using
                // cy.contains() seems to interrupt Chrome's scrollToElement animation, making it awkward to test
                // visibility without a wait.
                cy.wait(500);
                cy.contains('New answer').should('not.be.visible');
            });
        });

        describe('as quiz owner', () => {
            beforeEach(() => {
                cy.visit(`about:blank`);
                cy.callFirestore('update', `/quizzes/${quizId}`, { ownerId: Cypress.env('TEST_UID') });
                cy.visit(`/quiz/${quizId}`);
                for (const answerId of answerIds) {
                    cy.callFirestore('update', `/quizzes/${quizId}/answers/${answerId}`, { points: 0, correct: false });
                }
            });

            it('does not scroll when a new answer is submitted', () => {
                submitAnswer(clueIds[0], `New answer`);

                // Wait for a potential scroll to happen. Obviously, this is very hacky - it would be better to
                // do this without a hard-coded wait, but it's not clear how to achieve this. Even using
                // cy.contains() seems to interrupt Chrome's scrollToElement animation, making it awkward to test
                // visibility without a wait.
                cy.wait(500);
                cy.contains('New answer').should('not.be.visible');
            });
        });
    });
});