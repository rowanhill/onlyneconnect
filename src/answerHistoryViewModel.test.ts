import firebase from 'firebase/app';
import { createViewModel, VMSimpleAnswerGroup } from './answerHistoryViewModel';
import { CollectionQueryData, CollectionQueryItem } from './hooks/useCollectionResult';
import { Answer, Clue, Four, Question, Quiz, Team } from './models';

function time(s: number) {
    return new firebase.firestore.Timestamp(s, 0);
}

const createBuilder = () => {
    let isQuizOwner = false;
    const setIsQuizOwner = (value: boolean) => {
        isQuizOwner = value;
    }
    
    const quizId = 'quiz-id';
    const quiz: Quiz = {
        questionIds: [ 'question-id-1' ] as string[],
    } as Quiz;

    const teamsData: CollectionQueryData<Team> = [
        { id: 'team-id-1', data: { name: 'Team 1' } as Team },
        { id: 'team-id-2', data: { name: 'Team 2' } as Team },
        { id: 'team-id-3', data: { name: 'Team 3' } as Team },
    ];

    const questionsData: CollectionQueryData<Question> = [
        { id: 'question-id-1', data: { type: 'connection', clueIds: ['clue-id-1', 'clue-id-2', 'clue-id-3', 'clue-id-4'] } as Question },
    ];
    const addMissingVowelsQuestion = (details: {
        texts: Four<string>,
        revealedAt?: number,
        closedAt?: number,
    }) => {
        const questionId = `question-id-${questionsData.length + 1}`;
        const clueId = `clue-id-${cluesData.length + 1}`;
        const question: Question = {
            type: 'missing-vowels',
            answerLimit: 5,
            clueId,
        } as Question;
        const clue: Clue = {
            type: 'compound-text',
            answerLimit: null,
            questionId,
            texts: details.texts,
            revealedAt: details.revealedAt ? time(details.revealedAt) : undefined,
            closedAt: details.closedAt? time(details.closedAt) : undefined,
        } as Clue;

        const questionItem = { id: questionId, data: question };
        questionsData.push(questionItem);
        const clueItem = { id: clueId, data: clue };
        cluesData.push(clueItem);
        quiz.questionIds.push(questionId);

        return { questionItem, clueItem };
    };

    const cluesData: CollectionQueryData<Clue> = [
        { id: 'clue-id-1', data: { questionId: 'question-id-1', revealedAt: time(100), closedAt: time(200) } as Clue },
        { id: 'clue-id-2', data: { questionId: 'question-id-1', revealedAt: time(300), closedAt: time(400) } as Clue },
        { id: 'clue-id-3', data: { questionId: 'question-id-1', revealedAt: time(500), closedAt: time(600) } as Clue },
        { id: 'clue-id-4', data: { questionId: 'question-id-1', revealedAt: time(700) } as Clue },
    ];

    const answersData: CollectionQueryData<Answer> = [];
    const addSimpleAnswer = (details: {
        clueId: string;
        teamId: string;
        text: string;
        points?: number;
        correct?: boolean;
        submittedAt?: number;
    }) => {
        const clue = cluesData.find((c) => c.id === details.clueId);
        if (!clue) {
            throw new Error(`Cannot add answer to non-existant clue ${details.clueId}`);
        }
        let submittedAt = details.submittedAt;
        if (!submittedAt) {
            const answersForClue = answersData.filter((a) => a.data.clueId === details.clueId);
            if (answersForClue.length > 0) {
                submittedAt = answersForClue[answersForClue.length - 1].data.submittedAt.seconds + 1;
            } else {
                if (!clue.data.revealedAt) {
                    throw new Error('Cannot generate submittedAt time for new answer because there are no existing answers for the clue and the clue is not revealed');
                }
                submittedAt = clue.data.revealedAt.seconds + 1;
            }
        }
        const answerItem: CollectionQueryItem<Answer> = {
            id: `answer-id-${answersData.length + 1}`,
            data: {
                ...details,
                questionId: clue.data.questionId,
                submittedAt: time(submittedAt),
                type: 'simple',
            },
        };
        answersData.push(answerItem);
        answersData.sort((a, b) => a.data.submittedAt.toMillis() - b.data.submittedAt.toMillis());
        return answerItem;
    };
    const addWallAnswer = (details: {
        clueId: string;
        teamId: string;
        connections: Four<{ text: string; correct?: boolean|null; }>;
        points?: number;
        submittedAt?: number;
    }) => {
        const clue = cluesData.find((c) => c.id === details.clueId);
        if (!clue) {
            throw new Error(`Cannot add answer to non-existant clue ${details.clueId}`);
        }
        let submittedAt = details.submittedAt;
        if (!submittedAt) {
            const answersForClue = answersData.filter((a) => a.data.clueId === details.clueId);
            if (answersForClue.length > 0) {
                submittedAt = answersForClue[answersForClue.length - 1].data.submittedAt.seconds + 1;
            } else {
                if (!clue.data.revealedAt) {
                    throw new Error('Cannot generate submittedAt time for new answer because there are no existing answers for the clue and the clue is not revealed');
                }
                submittedAt = clue.data.revealedAt.seconds + 1;
            }
        }
        const answerItem: CollectionQueryItem<Answer> = {
            id: `answer-id-${answersData.length + 1}`,
            data: {
                ...details,
                connections: details.connections.map((c) => c.correct === undefined ? ({ ...c, correct: null }) : c) as Four<{ text: string; correct: boolean|null; }>,
                questionId: clue.data.questionId,
                submittedAt: time(submittedAt),
                type: 'wall',
            },
        }
        answersData.push(answerItem);
        answersData.sort((a, b) => a.data.submittedAt.toMillis() - b.data.submittedAt.toMillis());
        return answerItem;
    };

    const wallInProgressByTeamIdByClueId = {};
    const updateAnswerScoresAndCorrectFlags = jest.fn();
    const updateWallAnswerScoreAndCorrectFlag = jest.fn();

    const build = () => {
        return createViewModel(
            isQuizOwner,
            cluesData,
            questionsData,
            answersData,
            teamsData,
            wallInProgressByTeamIdByClueId,
            quiz,
            quizId,
            updateAnswerScoresAndCorrectFlags,
            updateWallAnswerScoreAndCorrectFlag,
        );
    }

    return {
        setIsQuizOwner,
        addMissingVowelsQuestion,
        addSimpleAnswer,
        addWallAnswer,
        build,
    };
};

describe('createViewModel', () => {
    let builder: ReturnType<typeof createBuilder>;
    beforeEach(() => {
        builder = createBuilder();
    });

    describe('focusAnswerId', () => {
        describe('as team member', () => {
            beforeEach(() => {
                builder.setIsQuizOwner(false);
            });

            it('is undefined if there are no answers yet', () => {
                const model = builder.build();
                expect(model.focusAnswerId).toBeUndefined();
            });

            describe('when answers are submitted in display order (as is expected)', () => {
                it('is the last answer in display order', () => {
                    builder.addSimpleAnswer({ clueId: 'clue-id-1', teamId: 'team-id-1', text: 'New answer 1' });
                    builder.addSimpleAnswer({ clueId: 'clue-id-1', teamId: 'team-id-1', text: 'New answer 2' });
                    const answer = builder.addSimpleAnswer({ clueId: 'clue-id-1', teamId: 'team-id-1', text: 'New answer 3' });
    
                    const model = builder.build();
    
                    expect(model.focusAnswerId).toBe(answer.id);
                });
            });

            describe('when the most recent answer is for an earlier clue (which would mean something has gone wrong)', () => {
                it('is the last answer in display order', () => {
                    builder.addSimpleAnswer({ clueId: 'clue-id-2', teamId: 'team-id-1', text: 'New answer 1' });
                    const lastAnswer = builder.addSimpleAnswer({ clueId: 'clue-id-2', teamId: 'team-id-1', text: 'New answer 2' });
                    builder.addSimpleAnswer({ clueId: 'clue-id-1', teamId: 'team-id-1', text: 'Out of order answer', submittedAt: lastAnswer.data.submittedAt.seconds + 1 });
    
                    const model = builder.build();
    
                    expect(model.focusAnswerId).toBe(lastAnswer.id);
                });
            });
        });

        describe('as quiz owner', () => {
            beforeEach(() => {
                builder.setIsQuizOwner(true);
            });

            it('is undefined if there are no answers yet', () => {
                const model = builder.build();
                expect(model.focusAnswerId).toBeUndefined();
            });

            it('is undefined if there are no unmarked answers', () => {
                builder.addSimpleAnswer({ clueId: 'clue-id-1', teamId: 'team-id-1', text: 'New answer', points: 1, correct: true });

                const model = builder.build();

                expect(model.focusAnswerId).toBeUndefined();
            });

            it('is the earliest unmarked answer in display order', () => {
                builder.addSimpleAnswer({ clueId: 'clue-id-1', teamId: 'team-id-1', text: 'New answer 1', points: 0, correct: false });
                const answer = builder.addSimpleAnswer({ clueId: 'clue-id-1', teamId: 'team-id-1', text: 'New answer 2' });
                builder.addSimpleAnswer({ clueId: 'clue-id-1', teamId: 'team-id-1', text: 'New answer 3' });

                const model = builder.build();

                expect(model.focusAnswerId).toBe(answer.id);
            });
            
            it('ignores invalid answers (as they do not need marking)', () => {
                // An old, marked answer for clue 1
                builder.addSimpleAnswer({ clueId: 'clue-id-1', teamId: 'team-id-1', text: 'Old answer', points: 0, correct: false });
                // An unmarked answer for clue 2
                const earliestValid = builder.addSimpleAnswer({ clueId: 'clue-id-2', teamId: 'team-id-1', text: 'New answer 1' });
                // A later answer for clue 2
                const lastAnswer = builder.addSimpleAnswer({ clueId: 'clue-id-2', teamId: 'team-id-1', text: 'New answer 2' });
                // An even later answer for clue 1 again - but this is invalid, as clue 1 has closed at it's submittedAt point
                builder.addSimpleAnswer({ clueId: 'clue-id-1', teamId: 'team-id-1', text: 'Out of order answer', submittedAt: lastAnswer.data.submittedAt.seconds + 1 });

                const model = builder.build();

                expect(model.focusAnswerId).toBe(earliestValid.id);
            });

            it('considers wall answers with at least one unmarked connection as unmarked (and so should be focused if earliest)', () => {
                builder.addWallAnswer({ clueId: 'clue-id-1', teamId: 'team-id-1', connections: [{ text: 'a', correct: false }, { text: 'b', correct: false }, { text: 'c', correct: false }, { text: 'd', correct: false }], points: 2 });
                const earliestUnmarked = builder.addWallAnswer({ clueId: 'clue-id-1', teamId: 'team-id-2', connections: [{ text: 'e', correct: false }, { text: 'f', correct: false }, { text: 'g', correct: false }, { text: 'h' }], points: 2 });
                builder.addWallAnswer({ clueId: 'clue-id-1', teamId: 'team-id-3', connections: [{ text: 'i' }, { text: 'j' }, { text: 'k' }, { text: 'l' }], points: 2 });

                const model = builder.build();

                expect(model.focusAnswerId).toBe(earliestUnmarked.id);
            });
        });
    });

    describe('answerGroup isValid', () => {
        it('is valid if the answer was submitted while the clue was open', () => {
            builder.addSimpleAnswer({ clueId: 'clue-id-1', teamId: 'team-id-1', text: 'Some answer' });

            const model = builder.build();

            expect(model.questions[0].clueGroups[0].answerGroups[0].isValid).toBeTruthy();
        });

        it('is invalid if the answer was submitted before the clue was opened', () => {
            builder.addSimpleAnswer({ clueId: 'clue-id-1', teamId: 'team-id-1', text: 'Some answer', submittedAt: 0 });

            const model = builder.build();

            expect(model.questions[0].clueGroups[0].answerGroups[0].isValid).toBeTruthy();
        });

        it('is invalid if the answer was submitted after the clue was closed', () => {
            builder.addSimpleAnswer({ clueId: 'clue-id-1', teamId: 'team-id-1', text: 'Some answer', submittedAt: 1000 });

            const model = builder.build();

            expect(model.questions[0].clueGroups[0].answerGroups[0].isValid).toBeFalsy();
        });
    });

    describe('marking info', () => {
        beforeEach(() => {
            builder.setIsQuizOwner(true);
        });

        describe('for answers to non-missing-vowels questions', () => {
            it('allows marking of all answers in any order', () => {
                builder.addSimpleAnswer({ clueId: 'clue-id-1', teamId: 'team-id-1', text: 'A' });
                builder.addSimpleAnswer({ clueId: 'clue-id-1', teamId: 'team-id-2', text: 'B' });
                builder.addSimpleAnswer({ clueId: 'clue-id-1', teamId: 'team-id-3', text: 'C' });

                const model = builder.build();

                const answerGroups = model.questions[0].clueGroups[0].answerGroups as VMSimpleAnswerGroup[];
                for (const answerGroup of answerGroups) {
                    const marking = answerGroup.answer.marking!;
                    expect(marking.supercededByCorrectAnswer).toBeFalsy();
                    expect(marking.canBeMarkedCorrect).toBeTruthy();
                    expect(marking.canBeMarkedIncorrect).toBeTruthy();
                }
            });

            it('disables marking correct if the answer is already correct', () => {
                builder.addSimpleAnswer({ clueId: 'clue-id-1', teamId: 'team-id-1', text: 'A', correct: true, points: 1 });

                const model = builder.build();

                const marking = (model.questions[0].clueGroups[0].answerGroups[0] as VMSimpleAnswerGroup).answer.marking!;
                expect(marking.supercededByCorrectAnswer).toBeFalsy();
                expect(marking.canBeMarkedCorrect).toBeFalsy();
                expect(marking.canBeMarkedIncorrect).toBeTruthy();
            });

            it('disables marking incorrect if the answer is already incorrect', () => {
                builder.addSimpleAnswer({ clueId: 'clue-id-1', teamId: 'team-id-1', text: 'A', correct: false, points: 0 });

                const model = builder.build();

                const marking = (model.questions[0].clueGroups[0].answerGroups[0] as VMSimpleAnswerGroup).answer.marking!;
                expect(marking.supercededByCorrectAnswer).toBeFalsy();
                expect(marking.canBeMarkedCorrect).toBeTruthy();
                expect(marking.canBeMarkedIncorrect).toBeFalsy();
            });

            it('disables all marking if the answer is superceded by a correct answer by the same team', () => {
                builder.addSimpleAnswer({ clueId: 'clue-id-1', teamId: 'team-id-1', text: 'A', correct: true, points: 1 });
                builder.addSimpleAnswer({ clueId: 'clue-id-2', teamId: 'team-id-2', text: 'B' });
                builder.addSimpleAnswer({ clueId: 'clue-id-2', teamId: 'team-id-1', text: 'C' });

                const model = builder.build();

                // Answer from the same team (on another clue) cannot be marked, as is superceded by the correct answer
                const sameTeamMarking = (model.questions[0].clueGroups[1].answerGroups[1] as VMSimpleAnswerGroup).answer.marking!;
                expect(sameTeamMarking.supercededByCorrectAnswer).toBeTruthy();

                // Answer from another team is unaffected
                const otherTeamMarking = (model.questions[0].clueGroups[1].answerGroups[0] as VMSimpleAnswerGroup).answer.marking!;
                expect(otherTeamMarking.supercededByCorrectAnswer).toBeFalsy();
                expect(otherTeamMarking.canBeMarkedCorrect).toBeTruthy();
                expect(otherTeamMarking.canBeMarkedIncorrect).toBeTruthy();
            });
        });

        describe('for answers to missing-vowels questions', () => {
            let clueId: string;
            beforeEach(() => {
                const { clueItem } = builder.addMissingVowelsQuestion({ texts: ['a', 'b', 'c', 'd'], revealedAt: 1000 });
                clueId = clueItem.id;
            });

            it('disallows marking an answer correct if there is an earlier answer to be marked', () => {
                builder.addSimpleAnswer({ clueId, teamId: 'team-id-1', text: 'blah' });
                builder.addSimpleAnswer({ clueId, teamId: 'team-id-2', text: 'bloop' });

                const model = builder.build();

                const firstMarking = (model.questions[1].clueGroups[0].answerGroups[0] as VMSimpleAnswerGroup).answer.marking!;
                expect(firstMarking.canBeMarkedCorrect).toBeTruthy();
                expect(firstMarking.canBeMarkedIncorrect).toBeTruthy();
                const secondMarking = (model.questions[1].clueGroups[0].answerGroups[1] as VMSimpleAnswerGroup).answer.marking!;
                expect(secondMarking.canBeMarkedCorrect).toBeFalsy();
                expect(secondMarking.canBeMarkedIncorrect).toBeTruthy();
            });

            it('does not consider an answer as needing marking if the team has answered correctly elsewhere', () => {
                builder.addSimpleAnswer({ clueId, teamId: 'team-id-1', text: 'correct', correct: true, points: 4 });
                builder.addSimpleAnswer({ clueId, teamId: 'team-id-1', text: 'follow up' });
                builder.addSimpleAnswer({ clueId, teamId: 'team-id-2', text: 'different team' });
                builder.addSimpleAnswer({ clueId, teamId: 'team-id-3', text: 'another different team' });

                const model = builder.build();

                const firstMarking = (model.questions[1].clueGroups[0].answerGroups[0] as VMSimpleAnswerGroup).answer.marking!;
                expect(firstMarking.canBeMarkedCorrect).toBeFalsy();
                expect(firstMarking.canBeMarkedIncorrect).toBeTruthy();
                const secondMarking = (model.questions[1].clueGroups[0].answerGroups[1] as VMSimpleAnswerGroup).answer.marking!;
                expect(secondMarking.supercededByCorrectAnswer).toBeTruthy();
                const thirdMarking = (model.questions[1].clueGroups[0].answerGroups[2] as VMSimpleAnswerGroup).answer.marking!;
                expect(thirdMarking.canBeMarkedCorrect).toBeTruthy();
                expect(thirdMarking.canBeMarkedIncorrect).toBeTruthy();
                const fourthMarking = (model.questions[1].clueGroups[0].answerGroups[3] as VMSimpleAnswerGroup).answer.marking!;
                expect(fourthMarking.canBeMarkedCorrect).toBeFalsy();
                expect(fourthMarking.canBeMarkedIncorrect).toBeTruthy();
            });

            it('does not consider invalid (too early) answers as needing marking', () => {
                builder.addSimpleAnswer({ clueId, teamId: 'team-id-1', text: 'too early', submittedAt: 900 });
                builder.addSimpleAnswer({ clueId, teamId: 'team-id-1', text: 'first needing marking' });

                const model = builder.build();

                const secondMarking = (model.questions[1].clueGroups[0].answerGroups[1] as VMSimpleAnswerGroup).answer.marking!;
                expect(secondMarking.canBeMarkedCorrect).toBeTruthy();
                expect(secondMarking.canBeMarkedIncorrect).toBeTruthy();
            });
        });
    });
});