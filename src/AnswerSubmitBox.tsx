import React, { useState, ChangeEvent, FormEvent } from 'react';
import { PrimaryButton } from './Button';
import { useQuizContext, useAnswersContext, useWallInProgressContext } from './contexts/quizPage';
import { CollectionQueryItem, CollectionQueryResult } from './hooks/useCollectionResult';
import { Clue, Question, Answer, FourByFourTextClue, WallQuestion, Four } from './models';
import { submitAnswer, submitWallAnswer } from './models/answer';
import styles from './AnswerSubmitBox.module.css';
import { GenericErrorBoundary } from './GenericErrorBoundary';

function attemptsRemaining(
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

function hasAnsweredQuestionCorrectly(
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

interface AnswerSubmitBoxProps {
    teamId: string;
    questionItem: CollectionQueryItem<Question>|undefined;
    clueItem: CollectionQueryItem<Clue>|undefined;
}
export const AnswerSubmitBox = ({ teamId, questionItem, clueItem }: AnswerSubmitBoxProps) => {
    if (questionItem?.data.type === 'wall') {
        const wallQuestion = questionItem as CollectionQueryItem<WallQuestion>;
        const wallClueItem = clueItem as CollectionQueryItem<FourByFourTextClue>|undefined;
        if (wallClueItem?.data.solution !== undefined) {
            return (
                <GenericErrorBoundary>
                    <FourAnswerSubmitBox teamId={teamId} questionItem={wallQuestion} clueItem={wallClueItem} />
                </GenericErrorBoundary>
            );
        } else {
            return null;
        }
    } else {
        return (
            <GenericErrorBoundary>
                <SingleAnswerSubmitBox teamId={teamId} questionItem={questionItem} clueItem={clueItem} />
            </GenericErrorBoundary>
        );
    }
};

const SingleAnswerSubmitBox = ({ teamId, questionItem, clueItem }: AnswerSubmitBoxProps) => {
    const { quizId } = useQuizContext();
    const answersResult = useAnswersContext();
    const [answerText, setAnswerText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const { attemptsRemainingForClue, attemptsRemainingForQuestion } = attemptsRemaining(clueItem, questionItem, answersResult, teamId);
    const hasReachedLimit = attemptsRemainingForClue === 0 || attemptsRemainingForQuestion === 0;
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
            <p>
                {attemptsRemainingForClue !== null && `${attemptsRemainingForClue} attempt(s) remaining for this clue.`}
                {attemptsRemainingForQuestion !== null && `${attemptsRemainingForQuestion} attempt(s) remaining for this question.`}
            </p>
        </form>
    );
};

interface FourAnswerSubmitBoxProps {
    teamId: string;
    questionItem: CollectionQueryItem<WallQuestion>;
    clueItem: CollectionQueryItem<FourByFourTextClue>;
}
const FourAnswerSubmitBox = ({ teamId, questionItem, clueItem }: FourAnswerSubmitBoxProps) => {
    const { quizId } = useQuizContext();
    const [answerTexts, setAnswerTexts] = useState(['', '', '', ''] as Four<string>);
    const [submitting, setSubmitting] = useState(false);
    const answersResult = useAnswersContext();
    const { wipByTeamByClue } = useWallInProgressContext();

    const wallInProgress = wipByTeamByClue && wipByTeamByClue[clueItem.id] && wipByTeamByClue[clueItem.id][teamId];

    if (!wallInProgress) {
        return null;
    }

    const allGroupsAnswered = () => {
        return !answerTexts.some((t) => typeof t !== 'string' || t === '');
    };

    const onAnswerChange = (answerIndex: number) => {
        return (e: ChangeEvent<HTMLInputElement>) => {
            e.preventDefault();
            const newText = e.target.value;
            const newTexts = [...answerTexts];
            newTexts[answerIndex] = newText;
            setAnswerTexts(newTexts as Four<string>);
        };
    };
    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!allGroupsAnswered()) {
            return;
        }

        setSubmitting(true);

        submitWallAnswer(
            quizId,
            questionItem.id,
            clueItem.id,
            teamId,
            answerTexts,
        )
        .then(() => {
            setSubmitting(false);
            setAnswerTexts(['', '', '', '']);
        })
        .catch((error) => {
            console.error("Could not submit wall answer", error);
        });
    };

    const hasAnsweredQuestion = answersResult.data && answersResult.data.some((answer) => {
        return answer.data.teamId === teamId && answer.data.questionId === questionItem.id;
    });

    const solutionGroupIndexesInAnswerOrder = (wallInProgress.data.correctGroups || []).map((g) => g.solutionGroupIndex);
    for (const i of [0, 1, 2, 3]) {
        if (!solutionGroupIndexesInAnswerOrder.includes(i)) {
            solutionGroupIndexesInAnswerOrder.push(i);
        }
    }

    const submitDisabled = !allGroupsAnswered();

    return (
        <form onSubmit={submit}>
            <fieldset className={styles.submitWallAnswerForm} disabled={submitting || !questionItem || !clueItem || hasAnsweredQuestion}>
                {solutionGroupIndexesInAnswerOrder.map((solutionGroupIndex, i) =>
                    <input
                        type="text"
                        placeholder={`Group ${i + 1} connection`}
                        value={answerTexts[solutionGroupIndex]}
                        onChange={onAnswerChange(solutionGroupIndex)}
                        data-cy={`answer-text-${i}`}
                    />
                )}
                <PrimaryButton data-cy="answer-submit" disabled={submitDisabled}>Submit</PrimaryButton>
            </fieldset>
            <p>{hasAnsweredQuestion ? '0 attempts remaining for this question' : '1 attempt remaining for this question'}</p>
        </form>
    );
};