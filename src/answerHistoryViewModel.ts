import { calculateUpdatedScores } from './answerScoreCalculator';
import { useWallInProgressContext } from './contexts/quizPage';
import { CollectionQueryData, CollectionQueryItem } from './hooks/useCollectionResult';
import { Clue, Question, Answer, Team, Quiz, getClueIds, SimpleAnswer, WallAnswer, WallInProgress } from './models';
import { AnswerUpdate } from './models/answer';

export interface VMAnswer {
    text: string;
    points?: number;
    marking?: {
        supercededByCorrectAnswer: boolean;
        canBeMarkedCorrect: boolean;
        canBeMarkedIncorrect: boolean;
        markCorrect: () => void;
        markIncorrect: () => void;
    }
}

export interface VMSimpleAnswerGroup {
    type: 'simple';
    id: string;
    isValid: boolean;
    answers: [VMAnswer];
    teamName?: string;
}

export interface VMWallAnswerGroup  {
    type: 'wall';
    id: string;
    isValid: boolean;
    answers: VMAnswer[];
    teamName?: string;
    numGroupsFound?: number;
    totalPoints: number;
}
export type VMAnswerGroup = VMSimpleAnswerGroup | VMWallAnswerGroup;

interface VMClueGroup {
    id: string;
    answerGroups: VMAnswerGroup[];
    numAnswers: number;
}

export interface VMQuestion {
    id: string;
    clueGroups: VMClueGroup[];
    numAnswers: number;
}

interface AnswersHistoryViewModel {
    focusAnswerId: string|undefined;
    quizId: string;
    questions: VMQuestion[];
}


export function createViewModel(
    isQuizOwner: boolean,
    cluesData: CollectionQueryData<Clue>,
    questionsData: CollectionQueryData<Question>,
    answersData: CollectionQueryData<Answer>,
    teamsData: CollectionQueryData<Team>,
    wallInProgressByTeamIdByClueId: ReturnType<typeof useWallInProgressContext>['wipByTeamByClue'],
    quiz: Quiz,
    quizId: string,
    updateAnswerScoresAndCorrectFlags: (answerUpdates: AnswerUpdate[]) => void,
    updateWallAnswerScoreAndCorrectFlag: (answerId: string, wallInProgressId: string, connectionIndex: number, connectionCorrect: boolean) => void,
): AnswersHistoryViewModel {
    const cluesById = Object.fromEntries(cluesData.map((clue) => [clue.id, clue]));
    const questionsById = Object.fromEntries(questionsData.map((question) => [question.id, question.data]));
    const answersByClueIdByQuestionId = answersData.reduce((acc, answer) => {
        if (!acc[answer.data.questionId]) {
            acc[answer.data.questionId] = {};
        }
        if (!acc[answer.data.questionId][answer.data.clueId]) {
            acc[answer.data.questionId][answer.data.clueId] = [];
        }
        acc[answer.data.questionId][answer.data.clueId].push(answer);
        return acc;
    }, {} as { [questionId: string]: { [clueId: string]: CollectionQueryItem<Answer>[] }; });

    const orderedAnswers = quiz.questionIds.flatMap((qid) => {
        const question = questionsById[qid];
        const questionAnswersByClue = answersByClueIdByQuestionId[qid];
        if (!questionAnswersByClue) {
            return [];
        } else {
            return getClueIds(question).flatMap((cid) => questionAnswersByClue[cid] || []);
        }
    });

    if (isQuizOwner) {
        return createOwnerViewModel(
            cluesById,
            questionsById,
            answersByClueIdByQuestionId,
            orderedAnswers,
            teamsData,
            wallInProgressByTeamIdByClueId || {},
            quiz,
            quizId,
            updateAnswerScoresAndCorrectFlags,
            updateWallAnswerScoreAndCorrectFlag,
        );
    } else {
        return createTeamViewModel(
            cluesById,
            questionsById,
            answersByClueIdByQuestionId,
            orderedAnswers,
            wallInProgressByTeamIdByClueId || {},
            quiz,
            quizId,
            updateAnswerScoresAndCorrectFlags,
            updateWallAnswerScoreAndCorrectFlag,
        );
    }
}

function createOwnerViewModel(
    cluesById: { [clueId: string]: CollectionQueryItem<Clue>;},
    questionsById: { [questionId: string]: Question; },
    answersByClueIdByQuestionId: { [questionId: string]: { [clueId: string]: CollectionQueryItem<Answer>[]; }; },
    orderedAnswers: CollectionQueryData<Answer>,
    teamsData: CollectionQueryData<Team>,
    wallInProgressByTeamIdByClueId: { [clueId: string]: { [teamId: string]: CollectionQueryItem<WallInProgress>; }; },
    quiz: Quiz,
    quizId: string,
    updateAnswerScoresAndCorrectFlags: (answerUpdates: AnswerUpdate[]) => void,
    updateWallAnswerScoreAndCorrectFlag: (answerId: string, wallInProgressId: string, connectionIndex: number, connectionCorrect: boolean) => void,
): AnswersHistoryViewModel {
    const teamNamesById = Object.fromEntries(teamsData.map((team) => [team.id, team.data.name]));

    const firstUnmarked = orderedAnswers.find((a) => a.data.points === undefined);
    const focusAnswerId = firstUnmarked?.id;

    const questions = createViewModelQuestions(
        quiz,
        questionsById,
        answersByClueIdByQuestionId,
        cluesById,
        wallInProgressByTeamIdByClueId,
        teamNamesById,
        updateAnswerScoresAndCorrectFlags,
        updateWallAnswerScoreAndCorrectFlag,
    );

    return {
        quizId,
        focusAnswerId,
        questions,
    };
}

function createTeamViewModel(
    cluesById: { [clueId: string]: CollectionQueryItem<Clue>;},
    questionsById: { [questionId: string]: Question; },
    answersByClueIdByQuestionId: { [questionId: string]: { [clueId: string]: CollectionQueryItem<Answer>[]; }; },
    orderedAnswers: CollectionQueryData<Answer>,
    wallInProgressByTeamIdByClueId: { [clueId: string]: { [teamId: string]: CollectionQueryItem<WallInProgress>; }; },
    quiz: Quiz,
    quizId: string,
    updateAnswerScoresAndCorrectFlags: (answerUpdates: AnswerUpdate[]) => void,
    updateWallAnswerScoreAndCorrectFlag: (answerId: string, wallInProgressId: string, connectionIndex: number, connectionCorrect: boolean) => void,
): AnswersHistoryViewModel {
    const focusAnswerId = orderedAnswers[orderedAnswers.length - 1]?.id;

    const questions = createViewModelQuestions(
        quiz,
        questionsById,
        answersByClueIdByQuestionId,
        cluesById,
        wallInProgressByTeamIdByClueId,
        {}, // An empty dictionary will mean all team names end up as 'undefined'
        updateAnswerScoresAndCorrectFlags,
        updateWallAnswerScoreAndCorrectFlag,
    );

    return {
        quizId,
        focusAnswerId,
        questions,
    };
}

function createViewModelQuestions(
    quiz: Quiz,
    questionsById: { [questionId: string]: Question; },
    answersByClueIdByQuestionId: { [questionId: string]: { [clueId: string]: CollectionQueryItem<Answer>[]; }; },
    cluesById: { [clueId: string]: CollectionQueryItem<Clue>;},
    wallInProgressByTeamIdByClueId: { [clueId: string]: { [teamId: string]: CollectionQueryItem<WallInProgress>; }; },
    teamNamesById: { [teamId: string]: string; },
    updateAnswerScoresAndCorrectFlags: (answerUpdates: AnswerUpdate[]) => void,
    updateWallAnswerScoreAndCorrectFlag: (answerId: string, wallInProgressId: string, connectionIndex: number, connectionCorrect: boolean) => void,
): VMQuestion[] {
    // Not all quiz questions might be available (e.g. if not revealed and current user is not quiz owner)
    const availableQuestions = quiz.questionIds.filter((questionId) => !!questionsById[questionId]);
    return availableQuestions.map((questionId) => {
        const question = questionsById[questionId];
        const clueIds = getClueIds(question);
        const answersByClueId = answersByClueIdByQuestionId[questionId] || {};
        const numAnswers = clueIds.map((cid) => answersByClueId[cid]?.length || 0).reduce((a, b) => a + b, 0);

        const clueGroups = createViewModelClueGroups(
            question,
            clueIds,
            answersByClueId,
            cluesById,
            wallInProgressByTeamIdByClueId,
            teamNamesById,
            updateAnswerScoresAndCorrectFlags,
            updateWallAnswerScoreAndCorrectFlag,
        );
        return {
            id: questionId,
            clueGroups,
            numAnswers,
        };
    });
}

function createViewModelClueGroups(
    question: Question,
    clueIds: string[],
    answersByClueId: { [clueId: string]: CollectionQueryItem<Answer>[]; },
    cluesById: { [clueId: string]: CollectionQueryItem<Clue>;},
    wallInProgressByTeamIdByClueId: { [clueId: string]: { [teamId: string]: CollectionQueryItem<WallInProgress>; }; },
    teamNamesById: { [teamId: string]: string; },
    updateAnswerScoresAndCorrectFlags: (answerUpdates: AnswerUpdate[]) => void,
    updateWallAnswerScoreAndCorrectFlag: (answerId: string, wallInProgressId: string, connectionIndex: number, connectionCorrect: boolean) => void,
): VMClueGroup[] {
    const idsAndIndexes = clueIds
        .map((cid, clueIndex) => ({ cid, clueIndex})) // Pair clue ID with index within the question
        .filter(({ cid }) => !!answersByClueId[cid]); // Only keep clues with any submitted anwers

    if (question.type !== 'wall') {
        const allAnswersForQuestion = clueIds.flatMap((cid) => answersByClueId[cid] || []) as CollectionQueryData<SimpleAnswer>;
        const correctAnswerIdByTeamId = Object.fromEntries(
            allAnswersForQuestion
                .filter((answerItem) => answerItem.data.correct === true)
                .map((answerItem) => [answerItem.data.teamId, answerItem.id])
        );
        const earlierAnswersAreUnmarked = (submittedAtMillis: number) => {
            return allAnswersForQuestion.some((item) => {
                return item.data.correct === undefined && // Item is umarked...
                    item.data.submittedAt && item.data.submittedAt.toMillis() < submittedAtMillis && // ...and prior to answer...
                    correctAnswerIdByTeamId[item.data.teamId] === undefined; // ...and not by a team with correct answer elsewhere...
            });
        };
        const teamHasAnotherCorrectAnswer = (teamId: string, answerId: string) => {
            const otherAnswerId = correctAnswerIdByTeamId[teamId];
            return otherAnswerId !== undefined && otherAnswerId !== answerId;
        };

        return idsAndIndexes.map(({ cid, clueIndex }) => {
            const answersForClue = answersByClueId[cid] as CollectionQueryData<SimpleAnswer>;
            const clue = cluesById[cid];

            const markCorrect = (answerId: string) => {
                const updates = calculateUpdatedScores(answerId, true, question, clueIndex, answersForClue);
                updateAnswerScoresAndCorrectFlags(updates);
            };
            const markIncorrect = (answerId: string) => {
                const updates = calculateUpdatedScores(answerId, false, question, clueIndex, answersForClue);
                updateAnswerScoresAndCorrectFlags(updates);
            };

            const answerGroups = createViewModelSimpleAnswerGroups(
                answersForClue as CollectionQueryData<SimpleAnswer>,
                clue.data,
                question,
                teamNamesById,
                earlierAnswersAreUnmarked,
                teamHasAnotherCorrectAnswer,
                markCorrect,
                markIncorrect,
            );
            const numAnswers = answerGroups.map((ag) => ag.answers.length).reduce((a, b) => a + b, 0);
            return { id: cid, answerGroups, numAnswers };
        });
    } else {
        return idsAndIndexes.map(({ cid }) => {
            const answersForClue = answersByClueId[cid];
            const clue = cluesById[cid];
            const wipForClueByTeamId = wallInProgressByTeamIdByClueId[cid] || {};

            const answerGroups = createViewModelWallAnswerGroups(
                answersForClue as CollectionQueryData<WallAnswer>,
                teamNamesById,
                wipForClueByTeamId,
                clue.data,
                updateWallAnswerScoreAndCorrectFlag,
            );
            const numAnswers = answerGroups.map((ag) => ag.answers.length).reduce((a, b) => a + b, 0);
            return { id: cid, answerGroups, numAnswers };
        });
    }
}

function createViewModelSimpleAnswerGroups(
    answersForClue: CollectionQueryData<SimpleAnswer>,
    clue: Clue,
    question: Question,
    teamNamesById: { [teamId: string]: string; },
    earlierAnswersAreUnmarked: (submittedAtMillis: number) => boolean,
    teamHasAnotherCorrectAnswer: (teamId: string, answerId: string) => boolean,
    markCorrect: (answerId: string) => void,
    markIncorrect: (answerId: string) => void,
): VMSimpleAnswerGroup[] {
    return answersForClue.map((answer) => {
        const supercededByCorrectAnswer = teamHasAnotherCorrectAnswer(answer.data.teamId, answer.id);
        const canBeMarkedCorrect = answer.data.correct !== true &&
            !(question.type === 'missing-vowels' && answer.data.submittedAt && earlierAnswersAreUnmarked(answer.data.submittedAt.toMillis()));
        const canBeMarkedIncorrect = answer.data.correct !== false;
        return {
            type: 'simple',
            id: answer.id,
            isValid: answerIsValid(answer.data, clue),
            answers: [
                {
                    text: answer.data.text,
                    points: answer.data.points,
                    marking: {
                        supercededByCorrectAnswer,
                        canBeMarkedCorrect,
                        canBeMarkedIncorrect,
                        markCorrect: () => markCorrect(answer.id),
                        markIncorrect: () => markIncorrect(answer.id),
                    }
                }
            ],
            teamName: teamNamesById[answer.data.teamId],
        };
    });
}

function createViewModelWallAnswerGroups(
    answersForClue: CollectionQueryData<WallAnswer>,
    teamNamesById: { [teamId: string]: string; },
    wipForClueByTeamId: { [teamId: string]: CollectionQueryItem<WallInProgress>; },
    clue: Clue,
    updateWallAnswerScoreAndCorrectFlag: (answerId: string, wallInProgressId: string, connectionIndex: number, connectionCorrect: boolean) => void,
): VMWallAnswerGroup[] {
    const answersWithWip = answersForClue.filter((answer) => {
        if (!wipForClueByTeamId) {
            return false;
        }
        const wip = wipForClueByTeamId[answer.data.teamId];
        if (!wip) {
            return false;
        }
        return true;
    });
    return answersWithWip.map((answer) => {
        const wip = wipForClueByTeamId[answer.data.teamId];
        const markCorrect = (connectionIndex: number) => {
            updateWallAnswerScoreAndCorrectFlag(answer.id, wip.id, connectionIndex, true);
        };
        const markIncorrect = (connectionIndex: number) => {
            updateWallAnswerScoreAndCorrectFlag(answer.id, wip.id, connectionIndex, false);
        };
        return {
            type: 'wall',
            id: answer.id,
            isValid: answerIsValid(answer.data, clue),
            answers: createViewModelWallAnswers(answer, markCorrect, markIncorrect),
            numGroupsFound: wip.data.correctGroups?.length,
            totalPoints: answer.data.points || 0,
            teamName: teamNamesById[answer.data.teamId],
        };
    });
}

function createViewModelWallAnswers(
    answer: CollectionQueryItem<WallAnswer>,
    markCorrect: (connectionIndex: number) => void,
    markIncorrect: (connectionIndex: number) => void,
): VMAnswer[] {
    return answer.data.connections.map((connection, connectionIndex): VMAnswer => ({
        text: connection.text,
        points: connection.correct === null ? undefined : (connection.correct ? 1 : 0),
        marking: {
            supercededByCorrectAnswer: false,
            canBeMarkedCorrect: connection.correct !== true,
            canBeMarkedIncorrect: connection.correct !== false,
            markCorrect: () => markCorrect(connectionIndex),
            markIncorrect: () => markIncorrect(connectionIndex),
        }
    }));
}

/**
 * Determines whether an answer is 'valid' - i.e. was submitted after the clue was revealed and before the clue was
 * closed
 */
 function answerIsValid(answer: Answer, clue: Clue) {
    if (!answer.submittedAt || !clue.revealedAt) {
        return false;
    }
    const submittedMillis = answer.submittedAt.toMillis();
    const revealedAtMillis = clue.revealedAt.toMillis();
    return submittedMillis >= revealedAtMillis && (!clue.closedAt || submittedMillis <= clue.closedAt.toMillis());
}