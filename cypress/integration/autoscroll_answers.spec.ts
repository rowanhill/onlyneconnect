import { ConnectionQuestionSpec } from '../../src/models/questionSpec';
import { answersHistory } from '../pages/quizPage';
import { CreateConnectionOrSequenceQuestionResult } from '../plugins';

describe('Autoscrolling of answers history', () => {
    let quizId: string;
    let teamId: string;
    let questionId: string;
    let clueIds: string[];
    let newAnswerIds: string[] = [];
    before(() => {
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

            const markAnswerIncorrect = (answerId: string) => {
                cy.callFirestore('update', `/quizzes/${quizId}/answers/${answerId}`, { points: 0, correct: false });
            };
            for (let i = 0; i < 30; i++) {
                submitAnswer(clueIds[0], `Answer ${i + 1}`).then(markAnswerIncorrect);
            }
        });
    });

    beforeEach(() => {
        newAnswerIds = [];
        cy.login();
    });

    afterEach(() => {
        if (newAnswerIds.length > 0) {
            for (const newAnswerId of newAnswerIds) {
                cy.callFirestore('delete', `/quizzes/${quizId}/answers/${newAnswerId}`);
            }
        }
    });

    function submitAnswer(clueId, text) {
        return cy.task('submitAnswer', {
            quizId,
            questionId,
            clueId,
            teamId,
            text,
        }).then((id) => {
            newAnswerIds.push(id as string);
            return id;
        });
    }

    function scrollAnswersUp() {
        cy.contains('Answer 30').scrollIntoView().should('be.visible');
        answersHistory().scrollTo(0, 130);
        cy.contains('Answer 1').should('not.be.visible'); // Check first answer has scrolled off the top
        lastAnswer().should('not.be.visible'); // Check last answer has scrolled off the bottom
        cy.window().its('__ONLYNE_CONNECT__IS_SCROLLING').should('be.false'); // Wait for scroll debounce to clear
    }

    function lastAnswer() {
        return cy.get('[data-cy^=submitted-answer]:last');
    }

    describe('as team member', () => {
        beforeEach(() => {
            cy.visit(`/quiz/${quizId}`);
            lastAnswer().scrollIntoView().should('be.visible');
            cy.contains('Answer 1').should('not.be.visible'); // Check first answer has scrolled off the top
        });

        describe('when autoscrolling is enabled', () => {
            it('autoscrolls when a new answer is submitted', () => {
                submitAnswer(clueIds[0], 'Team member auto on');
                cy.contains('Team member auto on').should('be.visible');
            });
        });

        describe('when autoscrolling is disabled (by scrolling away)', () => {
            beforeEach(scrollAnswersUp);

            it('does not scroll when a new answer is submitted', () => {
                submitAnswer(clueIds[0], 'Team member auto off');

                // Wait for a potential scroll to happen. Obviously, this is very hacky - it would be better to
                // do this without a hard-coded wait, but it's not clear how to achieve this. Even using
                // cy.contains() seems to interrupt Chrome's scrollToElement animation, making it awkward to test
                // visibility without a wait.
                cy.wait(500);
                cy.contains('Team member auto off').should('not.be.visible');
            });
        });
    });

    describe('as team captain', () => {
        beforeEach(() => {
            cy.callFirestore('update', `/teams/${teamId}`, { captainId: Cypress.env('TEST_UID') });
            cy.visit(`/quiz/${quizId}`);
            lastAnswer().scrollIntoView().should('be.visible');
            cy.contains('Answer 1').should('not.be.visible'); // Check first answer has scrolled off the top
        });

        describe('when autoscrolling is enabled', () => {
            it('autoscrolls when a new answer is submitted', () => {
                submitAnswer(clueIds[0], 'Captain auto on');
                cy.contains('Captain auto on').should('be.visible');
            });
        });

        describe('when autoscrolling is disabled (by scrolling away)', () => {
            beforeEach(scrollAnswersUp);

            it('does not scroll when a new answer is submitted', () => {
                submitAnswer(clueIds[0], 'Captain auto off');

                // Wait for a potential scroll to happen. Obviously, this is very hacky - it would be better to
                // do this without a hard-coded wait, but it's not clear how to achieve this. Even using
                // cy.contains() seems to interrupt Chrome's scrollToElement animation, making it awkward to test
                // visibility without a wait.
                cy.wait(500);
                cy.contains('Captain auto off').should('not.be.visible');
            });
        });
    });

    describe('as quiz owner', () => {
        beforeEach(() => {
            // Navigate away, because switching between quiz owner / not quiz owner whilst on the page can, as
            // various bits of data update at different moments, produce an invalid state, and cause an error.
            cy.visit('about:blank');
            cy.callFirestore('update', `/quizzes/${quizId}`, { ownerId: Cypress.env('TEST_UID') });
            cy.visit(`/quiz/${quizId}`);
        });


        describe('when autoscrolling is enabled', () => {
            it('autoscrolls when a new answer is submitted', () => {
                submitAnswer(clueIds[0], 'Owner auto on');

                // Wait for the scroll to complete. Ideally we'd wait for __ONLYNE_CONNECT__IS_SCROLLING
                // to be false, but even checking this seems to interrupt Chrome's scrollToElement animation.
                cy.wait(500);
                cy.contains('Owner auto on').should('be.visible');
            });
        });

        describe('when autoscrolling is disabled (by scrolling away)', () => {
            beforeEach(scrollAnswersUp);

            it('does not scroll when a new answer is submitted', () => {
                submitAnswer(clueIds[0], 'Owner auto off');

                // Wait for a potential scroll to happen. Obviously, this is very hacky - it would be better to
                // do this without a hard-coded wait, but it's not clear how to achieve this. Even using
                // cy.contains() seems to interrupt Chrome's scrollToElement animation, making it awkward to test
                // visibility without a wait.
                cy.wait(500);
                cy.contains('Owner auto off').should('not.be.visible');
            });
        });
    });
});