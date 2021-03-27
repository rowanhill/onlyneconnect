import { MissingVowelsQuestionSpec } from '../../src/models/quiz';
import { markAnswerCorrectButton, markAnswerIncorrectButton } from '../pages/quizPage';
import { CreateMissingVowelsOrWallQuestionResult } from '../plugins';

describe('Marking a missing vowels question', () => {
    let quizId: string;
    let teamId: string;
    let otherTeamId: string;
    let questionId: string;
    let clueId: string;
    beforeEach(() => {
        cy.login();
        cy.task<string>('createQuiz', {
            quizName: 'Test Quiz',
            passcode: 'itsasecret',
            ownerId: Cypress.env('TEST_UID'),
        }).then((id) => {
            quizId = id;

            const question: MissingVowelsQuestionSpec = {
                type: 'missing-vowels',
                answerLimit: 5,
                clue: { answerLimit: null, texts: ['Q1 C1', 'Q1 C2', 'Q1 C3', 'Q1 C4'], type: 'compound-text' },
                connection: 'Q1 Conn',
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
                captainId: 'someuid',
            });
        })
        .then((id) => {
            teamId = id;

            return cy.task<string>('createTeam', {
                quizId,
                quizPasscode: 'itsasecret',
                teamName: 'Another Team',
                teamPasscode: 'opensesame',
                captainId: 'someotheruid',
            });
        })
        .then((id) => {
            otherTeamId = id;

            // Reveal the question and clue
            cy.task('revealNextQuestion', { quizId, nextQuestionId: questionId });
            cy.task('revealNextClue', { quizId, nextClueId: clueId });
        })
        .then(() => {
            cy.visit(`/quiz/${quizId}`);
        });
    });

    function submitAnswer(text, tid = teamId) {
        return cy.task('submitAnswer', {
            quizId,
            questionId,
            clueId,
            teamId: tid,
            text,
        });
    }

    it('allows answers to be marked correct or incorrect, disabling invalid actions', () => {
        // A team captain submits an answer
        submitAnswer('Answer text').then((id) => cy.wrap(id).as('firstAnswerId'));

        cy.get('@firstAnswerId').then((answerId) => {
            // Can mark either correct or incorrect at first
            markAnswerCorrectButton(answerId).should('not.be.disabled');
            markAnswerIncorrectButton(answerId).should('not.be.disabled');

            // Mark correct - then can only mark incorrect
            markAnswerCorrectButton(answerId).should('not.be.disabled').click();
            markAnswerCorrectButton(answerId).should('be.disabled');
            markAnswerIncorrectButton(answerId).should('not.be.disabled');

            // Mark incorrect - then can only mark correct
            markAnswerIncorrectButton(answerId).should('not.be.disabled').click();
            markAnswerIncorrectButton(answerId).should('be.disabled');
            markAnswerCorrectButton(answerId).should('not.be.disabled');
        });

        // Team captains submit more answers
        submitAnswer('Answer text 2').then((id) => cy.wrap(id).as('secondAnswerId'));
        submitAnswer('Answer text 3', otherTeamId).then((id) => cy.wrap(id).as('thirdAnswerId'));

        // Second answer can be marked, but third answer can only be marked incorrect (until second question is marked)
        cy.get('@secondAnswerId').then((answerId) => {
            markAnswerCorrectButton(answerId).should('not.be.disabled');
            markAnswerIncorrectButton(answerId).should('not.be.disabled');
        });
        cy.get('@thirdAnswerId').then((answerId) => {
            markAnswerCorrectButton(answerId).should('be.disabled');
            markAnswerIncorrectButton(answerId).should('not.be.disabled');
        });

        // When first answer is marked correct, second answer buttons go away (as this team has answered correctly)
        cy.get('@firstAnswerId').then((answerId) => {
            markAnswerCorrectButton(answerId).should('not.be.disabled').click();
        });
        cy.get('@secondAnswerId').then((answerId) => {
            markAnswerCorrectButton(answerId).should('not.exist');
            markAnswerIncorrectButton(answerId).should('not.exist');
        });

        // When first answer is marked incorrect and second answer correct, first answer buttons go away
        cy.get('@firstAnswerId').then((answerId) => {
            markAnswerIncorrectButton(answerId).should('not.be.disabled').click();
        });
        cy.get('@secondAnswerId').then((answerId) => {
            markAnswerCorrectButton(answerId).should('not.be.disabled').click();
        });
        cy.get('@firstAnswerId').then((answerId) => {
            markAnswerCorrectButton(answerId).should('not.exist');
            markAnswerIncorrectButton(answerId).should('not.exist');
        });

        // Third answer can now be marked (because second answer has been marked)
        cy.get('@thirdAnswerId').then((answerId) => {
            markAnswerCorrectButton(answerId).should('not.be.disabled');
            markAnswerIncorrectButton(answerId).should('not.be.disabled');
        });
    });
});