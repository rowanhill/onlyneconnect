import { WallQuestionSpec } from '../../src/models/questionSpec';
import { answerInput, answersHistory, answerSubmit, revealedClues } from '../pages/quizPage';
import { CreateMissingVowelsOrWallQuestionResult } from '../plugins';

describe('Playing a wall question', () => {
    const unselectedColour = 'rgb(211, 242, 253)';
    const selectedColour = 'rgb(103, 195, 228)';
    const group1Colour = 'rgb(29, 64, 99)';
    const group2Colour = 'rgb(34, 119, 91)';
    const group3Colour = 'rgb(119, 34, 62)';
    const group4Colour = 'rgb(45, 142, 159)';

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
            ownerId: 'owneruid',
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

            cy.task('joinPlayerToTeam', {
                playerId: Cypress.env('TEST_UID'),
                teamId,
                teamPasscode: 'opensesame',
            });

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

    describe('as a team member', () => {
        it('shows a grid and differentiates current selections', () => {
            revealedClues()
                .should('have.length', 16)
                .and('have.css', 'background-color', unselectedColour)
                .and('not.have.css', 'cursor', 'pointer');
            
            // Captain selects three clues
            cy.task('updateWallInProgressSelections', { quizId, wipId, selectedTexts: ['G1 A', 'G2 A', 'G3 A'] });

            // Selected clues should appear selected
            cy.contains('G1 A').should('have.css', 'background-color', selectedColour);
            cy.contains('G2 A').should('have.css', 'background-color', selectedColour);
            cy.contains('G3 A').should('have.css', 'background-color', selectedColour);
        });

        it('shows correctly identified groups sorted to the start and colours them differently', () => {
            // Captain selects a group, server marks it correct
            cy.callFirestore('update', `quizzes/${quizId}/wallInProgress/${wipId}`, {
                correctGroups: [
                    { texts: ['G2 B', 'G2 D', 'G2 C', 'G2 A'], solutionGroupIndex: 1 },
                ],
                selectedTexts: [],
            });

            // Correct clues should appear as in group 1, on the first row
            cy.contains('G2 A').should('have.css', 'background-color', group1Colour).and('have.css', 'top', '0px');
            cy.contains('G2 B').should('have.css', 'background-color', group1Colour).and('have.css', 'top', '0px');
            cy.contains('G2 C').should('have.css', 'background-color', group1Colour).and('have.css', 'top', '0px');
            cy.contains('G2 D').should('have.css', 'background-color', group1Colour).and('have.css', 'top', '0px');
        });

        it('colours all correctly identified groups differently', () => {
            const correctGroups = [
                { texts: ['G2 B', 'G2 D', 'G2 C', 'G2 A'], solutionGroupIndex: 1 },
                { texts: ['G3 B', 'G3 D', 'G3 C', 'G3 A'], solutionGroupIndex: 2 },
                { texts: ['G1 B', 'G1 D', 'G1 C', 'G1 A'], solutionGroupIndex: 0 },
                { texts: ['G4 B', 'G4 D', 'G4 C', 'G4 A'], solutionGroupIndex: 4 },
            ];
            cy.callFirestore('update', `quizzes/${quizId}/wallInProgress/${wipId}`, {
                correctGroups,
                selectedTexts: [],
            });

            cy.get('[data-cy="wall-grid"]').invoke('width').then((width) => {
                return cy.get('[data-cy="wall-grid"]').invoke('height').then((height) => ({ width, height}));
            }).then(({ width, height }) => {
                const rowHeight = (height - 15) / 4;
                const colWidth = (width - 15) / 4;

                const row1Top = '0px';
                const row2Top = `${rowHeight + 5}px`;
                const row3Top = `${(rowHeight + 5) * 2}px`;
                const row4Top = `${(rowHeight + 5) * 3}px`;
                const tops = [row1Top, row2Top, row3Top, row4Top];

                const col1Left = '0px';
                const col2Left = `${colWidth + 5}px`;
                const col3Left = `${(colWidth + 5) * 2}px`;
                const col4Left = `${(colWidth + 5) * 3}px`;
                const lefts = [col1Left, col2Left, col3Left, col4Left];

                const colours = [group1Colour, group2Colour, group3Colour, group4Colour];

                correctGroups.forEach((group, groupIndex) => {
                    group.texts.forEach((text, textIndex) => {
                        cy.contains(text)
                            .should('have.css', 'background-color', colours[groupIndex])
                            .and('have.css', 'top', tops[groupIndex])
                            .and('have.css', 'left', lefts[textIndex]);
                    });
                });
            });
        });

        it('shows all groups when they are revealed, with user-found groups first', () => {
            cy.callFirestore('update', `quizzes/${quizId}/wallInProgress/${wipId}`, {
                correctGroups: [
                    { texts: ['G2 B', 'G2 D', 'G2 C', 'G2 A'], solutionGroupIndex: 1 },
                ],
            });
            cy.task('revealWallSolution', { quizId, questionId, clueId });

            const resolvedGroups = [
                ['G2 B', 'G2 D', 'G2 C', 'G2 A'],
                ['G1 A', 'G1 B', 'G1 C', 'G1 D'],
                ['G3 A', 'G3 B', 'G3 C', 'G3 D'],
                ['G4 A', 'G4 B', 'G4 C', 'G4 D'],
            ]

            cy.get('[data-cy="wall-grid"]').invoke('width').then((width) => {
                return cy.get('[data-cy="wall-grid"]').invoke('height').then((height) => ({ width, height}));
            }).then(({ width, height }) => {
                const rowHeight = (height - 15) / 4;
                const colWidth = (width - 15) / 4;

                const row1Top = '0px';
                const row2Top = `${rowHeight + 5}px`;
                const row3Top = `${(rowHeight + 5) * 2}px`;
                const row4Top = `${(rowHeight + 5) * 3}px`;
                const tops = [row1Top, row2Top, row3Top, row4Top];

                const col1Left = '0px';
                const col2Left = `${colWidth + 5}px`;
                const col3Left = `${(colWidth + 5) * 2}px`;
                const col4Left = `${(colWidth + 5) * 3}px`;
                const lefts = [col1Left, col2Left, col3Left, col4Left];

                const colours = [group1Colour, group2Colour, group3Colour, group4Colour];

                resolvedGroups.forEach((group, groupIndex) => {
                    group.forEach((text, textIndex) => {
                        cy.contains(text)
                            .should('have.css', 'background-color', colours[groupIndex])
                            .and('have.css', 'top', tops[groupIndex])
                            .and('have.css', 'left', lefts[textIndex]);
                    });
                });
            });
        });

        it('displays the number of lives remaining when applicable', () => {
            cy.callFirestore('update', `quizzes/${quizId}/wallInProgress/${wipId}`, { remainingLives: 2 });

            cy.contains('2 attempt(s) remaining. ????????')
        });

        it('displays the connections (in the same order as the groups are displayed) when the question is over', () => {
            cy.callFirestore('update', `quizzes/${quizId}/wallInProgress/${wipId}`, {
                correctGroups: [
                    { texts: ['G2 B', 'G2 D', 'G2 C', 'G2 A'], solutionGroupIndex: 1 },
                ],
            });
            cy.task('revealWallSolution', { quizId, questionId, clueId });
            cy.task('revealAnswer', { quizId, questionId });

            cy.contains('G2 conn').should('have.css', 'background-color', group1Colour);
            cy.contains('G1 conn').should('have.css', 'background-color', group2Colour);
            cy.contains('G3 conn').should('have.css', 'background-color', group3Colour);
            cy.contains('G4 conn').should('have.css', 'background-color', group4Colour);
        });

        it('displays submitted connections', () => {
            cy.callFirestore('update', `quizzes/${quizId}/wallInProgress/${wipId}`, {
                correctGroups: [
                    { texts: ['G2 B', 'G2 D', 'G2 C', 'G2 A'], solutionGroupIndex: 1 },
                ],
                selectedTexts: [],
            });
            cy.task('submitWallAnswer', {
                quizId,
                questionId,
                clueId,
                teamId,
                connections: ['Con 1', 'Con 2', 'Con 3', 'Con 4'],
            }).then((answerId) => {
                cy.task('updateWallAnswer', { quizId, answerId, wallInProgressId: wipId, connectionIndex: 0, connectionCorrect: true });
                cy.task('updateWallAnswer', { quizId, answerId, wallInProgressId: wipId, connectionIndex: 1, connectionCorrect: false });
            });

            answersHistory()
                .should('contain.text', 'Found 1 group(s)')
                .and('contain.text', 'Con 1 (1)')
                .and('contain.text', 'Con 2 (0)')
                .and('contain.text', 'Con 3 (unscored)')
                .and('contain.text', 'Con 4 (unscored)')
                .and('contain.text', 'Total: 2');
        });
    });

    describe('as a team captain', () => {
        beforeEach(() => {
            cy.callFirestore('update', `/teams/${teamId}`, { captainId: Cypress.env('TEST_UID') });
        });

        it('allows clues to be selected/deselected, and marked when group of 4 selected', () => {
            // All are clickable
            revealedClues().should('have.css', 'cursor', 'pointer');

            // Can be toggled selected / deselected
            cy.contains('G1 A')
                .should('have.css', 'background-color', unselectedColour)
                .click()
                .should('have.css', 'background-color', selectedColour)
                .click()
                .should('have.css', 'background-color', unselectedColour);
            
            // Selecting an incorrect group of four causes server to deselect them
            cy.contains('G1 A').click();
            cy.contains('G2 A').click();
            cy.contains('G3 A').click();
            cy.contains('G4 A').click();
            revealedClues().should('have.css', 'background-color', unselectedColour)
        });

        it('allows submitting connections when solution is revealed', () => {
            // No inputs when in grouping phase of the wall
            answerInput().should('not.exist');

            cy.callFirestore('update', `/quizzes/${quizId}/clues/${clueId}`, { solution: [
                { texts: ['G1 A', 'G1 B', 'G1 C', 'G1 D'] },
                { texts: ['G2 A', 'G2 B', 'G2 C', 'G2 D'] },
                { texts: ['G3 A', 'G3 B', 'G3 C', 'G3 D'] },
                { texts: ['G4 A', 'G4 B', 'G4 C', 'G4 D'] },
            ] });

            // An input for the connection of each group when in connection naming phase of the wall
            answerInput().should('have.length', 4).and('not.be.disabled');

            // The captain can't submit until an answer is provided for all groups
            answerSubmit().should('be.disabled');

            answerInput().each(($el, i) => {
                cy.wrap($el).type(`c${i + 1}`);
            });
            answerSubmit().click();

            // Inputs and button are disabled after submitting
            answerInput().should('be.disabled');
            answerSubmit().should('be.disabled');

            // Submitted connections appear in answer history
            answersHistory()
                .should('contain.text', 'c1')
                .and('contain.text', 'c2')
                .and('contain.text', 'c3')
                .and('contain.text', 'c4');
        });
    });
});