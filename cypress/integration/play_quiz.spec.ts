import { ConnectionQuestionSpec } from "../../src/models/quiz";
import { CreateConnectionQuestionResult } from "../plugins";

describe('The quiz page', () => {
    let quizId: string;
    let teamId: string;
    let questionAndClueIds: Array<CreateConnectionQuestionResult>;
    beforeEach(() => {
        cy.login();
        cy.task<string>('createQuiz', {
            quizName: 'Test Quiz',
            passcode: 'itsasecret',
            ownerId: 'owneruid',
        }).then((id) => {
            quizId = id;

            const question1: ConnectionQuestionSpec = {
                answerLimit: null,
                clues: [
                    { answerLimit: 1, text: 'Q1 C1' },
                    { answerLimit: 1, text: 'Q1 C2' },
                    { answerLimit: 1, text: 'Q1 C3' },
                    { answerLimit: 1, text: 'Q1 C4' },
                ],
            };
            return cy.task<CreateConnectionQuestionResult>('createConnectionQuestion', {
                quizId,
                question: question1,
            });
        }).then((ids) => {
            questionAndClueIds = [ids];
            const question2: ConnectionQuestionSpec = {
                answerLimit: null,
                clues: [
                    { answerLimit: 1, text: 'Q2 C1' },
                    { answerLimit: 1, text: 'Q2 C2' },
                    { answerLimit: 1, text: 'Q2 C3' },
                    { answerLimit: 1, text: 'Q2 C4' },
                ],
            };
            return cy.task<CreateConnectionQuestionResult>('createConnectionQuestion', {
                quizId,
                question: question2,
            });
        }).then((ids) => {
            questionAndClueIds.push(ids);
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
        })
        .then(() => {
            cy.visit(`/quiz/${quizId}`);
        });
    });

    const answerInput = () => cy.get('[data-cy="answer-text"]');
    const answerSubmit = () => cy.get('[data-cy="answer-submit"]');
    const revealedClues = () => cy.get('[data-cy^="revealed-clue"]');
    const unrevealedClues = () => cy.get('[data-cy^="unrevealed-clue"]');
    const answersHistory = () => cy.get('[data-cy="answers-history"]');
    const submittedAnswer = (id) => cy.get(`[data-cy="submitted-answer-${id}"]`);
    const scoreboard = () => cy.get('[data-cy="scoreboard"]');
    const quizControls = () => cy.get('[data-cy="quiz-controls"]');

    const expectRevealedCluesToBe = (clueTexts: string[]) => revealedClues().should(($clues) => {
        const texts = $clues.map((_, el) => Cypress.$(el).text());
        expect(texts.get()).to.deep.equal(clueTexts);
    });
    const expectUnrevealedCluesToBe = (clueTexts: string[]) => unrevealedClues().should(($clues) => {
        const texts = $clues.map((_, el) => Cypress.$(el).text());
        expect(texts.get()).to.deep.equal(clueTexts);
    });

    it('shows clues, questions, answers and scores as they are revealed/submitted', () => {
        cy.contains('Waiting for quiz to start');
        answerInput().should('not.exist');
        answerSubmit().should('not.exist');
        scoreboard().contains('Universally Challenged: 0');

        // Owner starts first question
        let questionId = questionAndClueIds[0].questionId;
        let clueIds = questionAndClueIds[0].clueIds;
        cy.task('revealNextQuestion', { quizId, nextQuestionId: questionId });
        cy.contains('Waiting for first clue');
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
            cy.task('markAnswer', { quizId, answerId, teamId, correct: false, score: 0 });
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
            cy.task('markAnswer', { quizId, answerId, teamId, correct: true, score: 4 });
        });
        answersHistory().contains('Second answer (4)');
        scoreboard().contains('Universally Challenged: 4');

        // Owner shows next question
        questionId = questionAndClueIds[1].questionId;
        cy.task('revealNextQuestion', { quizId, nextQuestionId: questionId, currentClueId: clueIds[3] });
        clueIds = questionAndClueIds[1].clueIds;
        cy.contains('Waiting for first clue');
        expectRevealedCluesToBe([]);

        // Onwer shows clues and ends quiz
        cy.task('revealNextClue', { quizId, nextClueId: clueIds[0] });
        cy.task('revealNextClue', { quizId, nextClueId: clueIds[1], currentClueId: clueIds[0] });
        cy.task('revealNextClue', { quizId, nextClueId: clueIds[2], currentClueId: clueIds[1] });
        cy.task('revealNextClue', { quizId, nextClueId: clueIds[3], currentClueId: clueIds[2] });
        cy.task('closeLastClue', { quizId, currentClueId: clueIds[3] });
    });

    describe('as team captain', () => {
        beforeEach(() => {
            cy.callFirestore('update', `/teams/${teamId}`, { captainId: Cypress.env('TEST_UID') });
        });

        it('allows answer submission', () => {
            answerInput().should('be.disabled');
            answerSubmit().should('be.disabled');

            // Owner starts first question
            let questionId = questionAndClueIds[0].questionId;
            let clueIds = questionAndClueIds[0].clueIds;
            cy.task('revealNextQuestion', { quizId, nextQuestionId: questionId });
            answerInput().should('be.disabled');
            answerSubmit().should('be.disabled');

            // Owner shows a clue
            cy.task('revealNextClue', { quizId, nextClueId: clueIds[0] });
            answerInput().should('not.be.disabled');
            answerSubmit().should('not.be.disabled');

            // User submits answer
            answerInput().type('Some answer');
            answerSubmit().click();
            answersHistory().contains('Some answer (unscored)');
        });
    });

    describe('as quiz owner', () => {
        beforeEach(() => {
            cy.callFirestore('update', `/quizzes/${quizId}`, { ownerId: Cypress.env('TEST_UID') });
        });

        it('allows question/clue revelation and answer marking', () => {
            cy.contains('Waiting for quiz to start');
            answerInput().should('not.exist');
            answerSubmit().should('not.exist');

            // Start the quiz
            quizControls().contains('Start quiz').click();
            expectRevealedCluesToBe([]);
            expectUnrevealedCluesToBe(['(Q1 C1)', '(Q1 C2)', '(Q1 C3)', '(Q1 C4)']);

            // Reveal the first clue
            quizControls().contains('Next clue').click();
            expectRevealedCluesToBe(['Q1 C1']);
            expectUnrevealedCluesToBe(['(Q1 C2)', '(Q1 C3)', '(Q1 C4)']);

            // Reveal all remaining clues
            quizControls().contains('Next clue').click();
            quizControls().contains('Next clue').click();
            quizControls().contains('Next clue').click();
            expectRevealedCluesToBe(['Q1 C1', 'Q1 C2', 'Q1 C3', 'Q1 C4']);
            expectUnrevealedCluesToBe([]);

            // Start the next question and show the first clue
            quizControls().contains('Next question').click();
            expectRevealedCluesToBe([]);
            expectUnrevealedCluesToBe(['(Q2 C1)', '(Q2 C2)', '(Q2 C3)', '(Q2 C4)']);
            quizControls().contains('Next clue').click();

            // A team captain submits an answer
            cy.task('submitAnswer', {
                quizId,
                questionId: questionAndClueIds[1].questionId,
                clueId: questionAndClueIds[1].clueIds[0],
                teamId,
                text: 'Answer text',
            }).then((id) => {
                cy.wrap(id).as('firstAnswerId');
            });;
            answersHistory().contains('✔️');
            answersHistory().contains('❌');

            // Mark correct
            answersHistory().contains('✔️').click();
            answersHistory().contains('✔️').should('not.exist');
            answersHistory().contains('❌').should('exist');

            // Mark incorrect
            answersHistory().contains('❌').click();
            answersHistory().contains('❌').should('not.exist');
            answersHistory().contains('✔️').should('exist');

            // Show next clue and captain submits another answer
            quizControls().contains('Next clue').click();
            cy.task('submitAnswer', {
                quizId,
                questionId: questionAndClueIds[1].questionId,
                clueId: questionAndClueIds[1].clueIds[1],
                teamId,
                text: 'Answer text 2',
            }).then((id) => {
                cy.wrap(id).as('secondAnswerId');
            });
            cy.get('@secondAnswerId').then((answerId) => {
                submittedAnswer(answerId).contains('✔️');
                submittedAnswer(answerId).contains('❌');
            });
            cy.get('@firstAnswerId').then((answerId) => {
                submittedAnswer(answerId).contains('✔️').click();
            });
            cy.get('@secondAnswerId').then((answerId) => {
                submittedAnswer(answerId).contains('✔️').should('not.exist');
                submittedAnswer(answerId).contains('❌').should('not.exist');
            });
        });
    });
});