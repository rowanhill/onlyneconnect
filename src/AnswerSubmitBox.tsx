import React, { useState, ChangeEvent, FormEvent } from 'react';
import { PrimaryButton } from './Button';
import { useQuizContext, useAnswersContext } from './contexts/quizPage';
import { CollectionQueryItem, CollectionQueryResult } from './hooks/useCollectionResult';
import { Clue, Question, Answer } from './models';
import { submitAnswer } from './models/answer';
import styles from './AnswerSubmitBox.module.css';

function hasReachedAnswerLimit(
    clueItem: CollectionQueryItem<Clue>|undefined,
    questionItem: CollectionQueryItem<Question>|undefined,
    answersResult: CollectionQueryResult<Answer>,
    teamId: string,
): boolean {
    if (!answersResult.data) {
        return false;
    }
    if (questionItem && questionItem.data.answerLimit) {
        const answersForQuestion = answersResult.data.filter((answer) => answer.data.questionId === questionItem.id && answer.data.teamId === teamId);
        if (answersForQuestion.length >= questionItem.data.answerLimit) {
            return true;
        }
    }
    if (clueItem && clueItem.data.answerLimit) {
        const answersForClue = answersResult.data.filter((answer) => answer.data.clueId === clueItem.id && answer.data.teamId === teamId);
        if (answersForClue.length >= clueItem.data.answerLimit) {
            return true;
        }
    }
    return false;
}

function hasAnsweredQuestionCorrectly(
    questionItem: CollectionQueryItem<Question>|undefined,
    answersResult: CollectionQueryResult<Answer>,
    teamId: string,
): boolean {
    if (!questionItem || !answersResult.data) {
        return false;
    }
    return answersResult.data.some((answer) => answer.data.questionId === questionItem.id && answer.data.teamId === teamId && answer.data.correct === true);
}

export const AnswerSubmitBox = ({ teamId, questionItem, clueItem }: { teamId: string; questionItem: CollectionQueryItem<Question>|undefined; clueItem: CollectionQueryItem<Clue>|undefined; }) => {
    const { quizId } = useQuizContext();
    const answersResult = useAnswersContext();
    const [answerText, setAnswerText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const hasReachedLimit = hasReachedAnswerLimit(clueItem, questionItem, answersResult, teamId);
    const alreadyAnsweredCorrectly = hasAnsweredQuestionCorrectly(questionItem, answersResult, teamId);
    const onAnswerChange = (e: ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        setAnswerText(e.target.value);
    };
    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!questionItem) {
            console.error('Tried to submit an answer without a current question');
            return;
        }
        if (!clueItem) {
            console.error('Tried to submit an answer without a current clue');
            return;
        }

        setSubmitting(true);

        submitAnswer(
            quizId,
            questionItem.id,
            clueItem.id,
            teamId,
            answerText,
        )
        .then(() => {
            setSubmitting(false);
            setAnswerText('');
        })
        .catch((error) => {
            console.error("Could not submit answer", error);
        });
    };
    return (
        <form onSubmit={submit}>
            <fieldset className={styles.submitAnswerForm} disabled={submitting || !questionItem || !clueItem || hasReachedLimit || alreadyAnsweredCorrectly}>
                <input type="text" placeholder="Type your answer here" value={answerText} onChange={onAnswerChange} data-cy="answer-text" />
                <PrimaryButton data-cy="answer-submit">Submit</PrimaryButton>
            </fieldset>
        </form>
    );
};