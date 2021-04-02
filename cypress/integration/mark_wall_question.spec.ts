import { WallQuestionSpec } from '../../src/models/questionSpec';
import { markAnswerConnectionCorrectButton, markAnswerConnectionIncorrectButton, submittedAnswer, submittedAnswerSelector } from '../pages/quizPage';
import { CreateMissingVowelsOrWallQuestionResult } from '../plugins';

describe('Marking a wall question', () => {
    let quizId: string;
    let questionId: string;
    let clueId: string;
    let teamId: string;
    let wipId: string;
    beforeEach(() => {
        cy.login();
        cy.task<string>('createQuiz', {
            quizName: 'Test Quiz',
            passcode: 'itsasecret',
            ownerId: Cypress.env('TEST_UID'),
        }).then((id) => {
            quizId = id;

            const wallSpec: WallQuestionSpec = {
                type: 'wall',
                answerLimit: null,
                clue: {
                    type: 'four-by-four-text',
                    answerLimit: null,
                    solution: [
                        { texts: ['G1 A', 'G1 B', 'G1 C', 'G1 D'] },
                        { texts: ['G2 A', 'G2 B', 'G2 C', 'G2 D'] },
                        { texts: ['G3 A', 'G3 B', 'G3 C', 'G3 D'] },
                        { texts: ['G4 A', 'G4 B', 'G4 C', 'G4 D'] },
                    ],
                    connections: ['G1 conn', 'G2 conn', 'G3 conn', 'G4 conn'],
                },
            };
            return cy.task<CreateMissingVowelsOrWallQuestionResult>('createWallQuestion', { quizId, question: wallSpec });
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
        }).then((id) => {
            teamId = id;

            // Reveal the question and grid
            cy.task('revealNextQuestion', { quizId, nextQuestionId: questionId });
            cy.task('revealNextClue', { quizId, nextClueId: clueId });
    
            // Create a WallInProgress for the team
            return cy.task<string>('createWallInProgress', { quizId, questionId, clueId, teamId });
        }).then((id) => {
            wipId = id;

            cy.visit(`/quiz/${quizId}`);
        });
    });

    it('allows marking each connection of a submitted answer, calculating points (including bonus)', () => {
        // Team find all the groups
        cy.callFirestore('update', `/quizzes/${quizId}/wallInProgress/${wipId}`, { correctGroups: [{}, {}, {}, {}] });

        // Captain submits answer
        cy.task('submitWallAnswer', { quizId, questionId, clueId, teamId, connections: ['Con1', 'Con2', 'Con3', 'Con4'] })
            .then((id) => cy.wrap(id).as('answerId'));

        cy.get('@answerId').then((answerId) => {
            // Lists number of found groups
            submittedAnswer(answerId).contains('Found 4 group(s)').should('exist');

            // Can mark either correct or incorrect at first
            markAnswerConnectionCorrectButton(answerId, 0).should('not.be.disabled');
            markAnswerConnectionIncorrectButton(answerId, 0).should('not.be.disabled');

            // Mark correct - then can only mark incorrect
            markAnswerConnectionCorrectButton(answerId, 0).should('not.be.disabled').click();
            markAnswerConnectionCorrectButton(answerId, 0).should('be.disabled');
            markAnswerConnectionIncorrectButton(answerId, 0).should('not.be.disabled');

            // Mark incorrect - then can only mark correct
            markAnswerConnectionIncorrectButton(answerId, 0).should('not.be.disabled').click();
            markAnswerConnectionIncorrectButton(answerId, 0).should('be.disabled');
            markAnswerConnectionCorrectButton(answerId, 0).should('not.be.disabled');

            // With first connection marked incorrect, have 4 points from found groups
            cy.contains(submittedAnswerSelector(answerId), 'Total: 4').should('exist');

            // Mark connections 2-4 correct
            markAnswerConnectionCorrectButton(answerId, 1).should('not.be.disabled').click();
            markAnswerConnectionCorrectButton(answerId, 2).should('not.be.disabled').click();
            markAnswerConnectionCorrectButton(answerId, 3).should('not.be.disabled').click();

            // Now have 7 points from found groups and correct answers
            cy.contains(submittedAnswerSelector(answerId), 'Total: 7').should('exist');

            // Mark connection 1 correct awards 2 bonus points for total of 10
            markAnswerConnectionCorrectButton(answerId, 0).should('not.be.disabled').click();
            cy.contains(submittedAnswerSelector(answerId), 'Total: 10').should('exist');
        });
    });
});