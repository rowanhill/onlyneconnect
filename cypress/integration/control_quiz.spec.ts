import { ConnectionQuestionSpec, MissingVowelsQuestionSpec, SequenceQuestionSpec, WallQuestionSpec } from '../../src/models/quiz';
import { quizControls, expectRevealedCluesToBe, expectUnrevealedCluesToBe, unrevealedClues, revealedClues } from '../pages/quizPage';
import { CreateConnectionOrSequenceQuestionResult, CreateMissingVowelsOrWallQuestionResult } from '../plugins';

describe('Controlling the quiz', () => {
    beforeEach(() => {
        cy.login();

        cy.task<string>('createQuiz', {
            quizName: 'Test Quiz',
            passcode: 'itsasecret',
            ownerId: Cypress.env('TEST_UID'),
        })
        .then((quizId) => {
            const question1: ConnectionQuestionSpec = {
                type: 'connection',
                answerLimit: null,
                clues: [
                    { answerLimit: 1, text: 'Q1 C1', type: 'text' },
                    { answerLimit: 1, text: 'Q1 C2', type: 'text' },
                    { answerLimit: 1, text: 'Q1 C3', type: 'text' },
                    { answerLimit: 1, text: 'Q1 C4', type: 'text' },
                ],
            };
            cy.task<CreateConnectionOrSequenceQuestionResult>('createConnectionOrSequenceQuestion', {
                quizId,
                question: question1,
            });

            const question2: SequenceQuestionSpec = {
                type: 'sequence',
                answerLimit: null,
                clues: [
                    { answerLimit: 1, text: 'Q2 C1', type: 'text' },
                    { answerLimit: 1, text: 'Q2 C2', type: 'text' },
                    { answerLimit: 1, text: 'Q2 C3', type: 'text' },
                ],
            };
            cy.task<CreateConnectionOrSequenceQuestionResult>('createConnectionOrSequenceQuestion', {
                quizId,
                question: question2,
            });

            const quesiton3: WallQuestionSpec = {
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
                },
            };
            cy.task<CreateMissingVowelsOrWallQuestionResult>('createWallQuestion', { quizId, question: quesiton3 });

            const question4: MissingVowelsQuestionSpec = {
                type: 'missing-vowels',
                answerLimit: null,
                clue: { answerLimit: null, texts: ['Q4 C1', 'Q4 C2', 'Q4 C3', 'Q4 C4'], type: 'compound-text' },
            };
            cy.task<CreateMissingVowelsOrWallQuestionResult>('createMissingVowelsQuestion', {
                quizId,
                question: question4,
            });

            cy.visit(`/quiz/${quizId}`);
        });
    });

    it('allows the quiz owner to start the quiz, reveal questions and clues, and end the quiz', () => {
        cy.contains('Waiting for quiz to start');

        // Start the quiz, revealing the connection question (but no clues)
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

        // Start the second question (a sequence question)
        quizControls().contains('Next question').click();
        expectRevealedCluesToBe([]);
        expectUnrevealedCluesToBe(['(Q2 C1)', '(Q2 C2)', '(Q2 C3)']);

        // Reveal the clues
        quizControls().contains('Next clue').click();
        quizControls().contains('Next clue').click();
        quizControls().contains('Next clue').click();
        expectRevealedCluesToBe(['Q2 C1', 'Q2 C2', 'Q2 C3']);
        expectUnrevealedCluesToBe([]);

        // Start the third question (a wall)
        quizControls().contains('Next question').click();
        expectRevealedCluesToBe([]);
        unrevealedClues().should('have.length', 16);

        // Reveal the wall
        quizControls().contains('Next clue').click();
        revealedClues().should('have.length', 16);
        expectUnrevealedCluesToBe([]);

        // Resolve the groups
        quizControls().contains('Resolve wall groups').click();

        // Start the last question (a missing vowels round)
        quizControls().contains('Next question').click();
        expectRevealedCluesToBe([]);
        expectUnrevealedCluesToBe(['(Q4 C1)', '(Q4 C2)', '(Q4 C3)', '(Q4 C4)']);

        // Reveal the de-vowelled words
        quizControls().contains('Next clue').click();
        expectRevealedCluesToBe(['Q4 C1', 'Q4 C2', 'Q4 C3', 'Q4 C4']);
        expectUnrevealedCluesToBe([]);

        // End the quiz
        quizControls().contains('End quiz').click();
    });
});