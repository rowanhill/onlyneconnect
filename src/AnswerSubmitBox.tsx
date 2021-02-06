import React, { useState, ChangeEvent, FormEvent } from 'react';
import { PrimaryButton } from './Button';
import { useQuizContext, useAnswersContext } from './contexts/quizPage';
import { CollectionQueryItem, CollectionQueryResult } from './hooks/useCollectionResult';
import { Clue, Question, Answer, FourByFourTextClue, WallQuestion, Four } from './models';
import { submitAnswer, submitWallAnswer } from './models/answer';
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
            return <FourAnswerSubmitBox teamId={teamId} questionItem={wallQuestion} clueItem={wallClueItem} />;
        } else {
            return null;
        }
    } else {
        return <SingleAnswerSubmitBox teamId={teamId} questionItem={questionItem} clueItem={clueItem} />;
    }
};

const SingleAnswerSubmitBox = ({ teamId, questionItem, clueItem }: AnswerSubmitBoxProps) => {
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

    return (
        <form onSubmit={submit}>
            <fieldset className={styles.submitAnswerForm} disabled={submitting || !questionItem || !clueItem || hasAnsweredQuestion}>
                <input type="text" placeholder="Group 1 connection" value={answerTexts[0]} onChange={onAnswerChange(0)} data-cy="answer-text-0" />
                <input type="text" placeholder="Group 2 connection" value={answerTexts[1]} onChange={onAnswerChange(1)} data-cy="answer-text-1" />
                <input type="text" placeholder="Group 3 connection" value={answerTexts[2]} onChange={onAnswerChange(2)} data-cy="answer-text-2" />
                <input type="text" placeholder="Group 4 connection" value={answerTexts[3]} onChange={onAnswerChange(3)} data-cy="answer-text-3" />
                <PrimaryButton data-cy="answer-submit">Submit</PrimaryButton>
            </fieldset>
        </form>
    );
};