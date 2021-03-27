import { CollectionQueryItem, CollectionQueryResult } from './hooks/useCollectionResult';
import { Clue, Question, Answer } from './models';

export function hasAttemptsRemaining(
    clueItem: CollectionQueryItem<Clue>|undefined,
    questionItem: CollectionQueryItem<Question>|undefined,
    answersResult: CollectionQueryResult<Answer>,
    teamId: string,
): boolean {
    if (hasAnsweredQuestionCorrectly(questionItem, answersResult, teamId)) {
        return false;
    }
    const remaining = attemptsRemaining(clueItem, questionItem, answersResult, teamId);
    return (remaining.attemptsRemainingForClue !== null && remaining.attemptsRemainingForClue > 0) ||
        (remaining.attemptsRemainingForQuestion !== null && remaining.attemptsRemainingForQuestion > 0);
}

export function attemptsRemaining(
    clueItem: CollectionQueryItem<Clue>|undefined,
    questionItem: CollectionQueryItem<Question>|undefined,
    answersResult: CollectionQueryResult<Answer>,
    teamId: string,
): { attemptsRemainingForClue: number|null; attemptsRemainingForQuestion: number|null; } {
    let attemptsRemainingForClue: number|null = 0;
    let attemptsRemainingForQuestion: number|null = 0;
    if (answersResult.data) {
        if (questionItem?.data.answerLimit) {
            const answersForQuestion = answersResult.data.filter((answer) => answer.data.questionId === questionItem.id && answer.data.teamId === teamId);
            attemptsRemainingForQuestion = questionItem.data.answerLimit - answersForQuestion.length;
        } else {
            attemptsRemainingForQuestion = null;
        }
        if (clueItem?.data.answerLimit) {
            const answersForClue = answersResult.data.filter((answer) => answer.data.clueId === clueItem.id && answer.data.teamId === teamId);
            attemptsRemainingForClue = clueItem.data.answerLimit - answersForClue.length;
        } else {
            attemptsRemainingForClue = null;
        }
    }
    return { attemptsRemainingForClue, attemptsRemainingForQuestion };
}

export function hasAnsweredQuestionCorrectly(
    questionItem: CollectionQueryItem<Question>|undefined,
    answersResult: CollectionQueryResult<Answer>,
    teamId: string,
): boolean {
    if (!questionItem || !answersResult.data) {
        return false;
    }
    return answersResult.data.some((answer) =>
        answer.data.questionId === questionItem.id &&
        answer.data.teamId === teamId &&
        answer.data.type === 'simple' &&
        answer.data.correct === true
    );
}