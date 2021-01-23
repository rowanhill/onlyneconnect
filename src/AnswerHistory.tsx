import React from 'react';
import { PrimaryButton } from './Button';
import { useAnswersContext, useCluesContext, useQuestionsContext, useQuizContext, useTeamsContext } from './contexts/quizPage';
import { CollectionQueryItem } from './hooks/useCollectionResult';
import { Answer, Question } from './models';
import { markAnswer } from './models/answer';
import styles from './AnswerHistory.module.css';
import { calculateScore } from './answerScoreCalculator';

interface AnswerMeta {
    answer: CollectionQueryItem<Answer>;
    valid: boolean;
    clueIndex: number;
    question: Question;
}

export const AnswersHistory = ({ isQuizOwner }: { isQuizOwner: boolean; }) => {
    const { quizId, quiz } = useQuizContext();
    const { data: answersData, loading: answersLoading, error: answersError } = useAnswersContext();
    const { data: cluesData, loading: cluesLoading, error: cluesError } = useCluesContext();
    const { data: questionsData, loading: questionsLoading, error: questionsError } = useQuestionsContext();
    const { data: teamsData } = useTeamsContext();
    if (answersError || cluesError || questionsError) {
        return <div className={styles.answersHistory}><strong>There was an error loading your answers! Please try again</strong></div>;
    }
    if (answersLoading || !answersData || cluesLoading || !cluesData || questionsLoading || !questionsData) {
        return <div className={styles.answersHistory}></div>;
    }
    const cluesById = Object.fromEntries(cluesData.map((clue) => [clue.id, clue]));
    const questionsById = Object.fromEntries(questionsData.map((question) => [question.id, question]));
    const teamsById = isQuizOwner && teamsData ? Object.fromEntries(teamsData.map((team) => [team.id, team])) : {};
    const answerMetasByQuestionId = answersData.reduce((acc, answer) => {
        if (!acc[answer.data.questionId]) {
            acc[answer.data.questionId] = [];
        }
        const clue = cluesById[answer.data.clueId];
        const valid = clue && !!answer.data.submittedAt && !!clue.data.revealedAt &&
            answer.data.submittedAt.toMillis() >= clue.data.revealedAt.toMillis() &&
            (!clue.data.closedAt || answer.data.submittedAt.toMillis() <= clue.data.closedAt.toMillis());
        const question = questionsById[answer.data.questionId];
        const clueIndex = question.data.clueIds.indexOf(answer.data.clueId);
        acc[answer.data.questionId].push({ answer, valid, clueIndex, question: question.data });
        return acc;
    }, {} as { [id: string]: AnswerMeta[]});
    const answerGroups = quiz.questionIds
        .map((id) => ({ questionId: id, answerMetas: answerMetasByQuestionId[id] }))
        .filter((group) => !!group.answerMetas);
    const answersByQuestionByTeam = answersData.reduce((acc, answer) => {
        if (!acc[answer.data.teamId]) {
            acc[answer.data.teamId] = {};
        }
        if (!acc[answer.data.teamId][answer.data.questionId]) {
            acc[answer.data.teamId][answer.data.questionId] = [];
        }
        acc[answer.data.teamId][answer.data.questionId].push(answer);
        acc[answer.data.teamId][answer.data.questionId].sort((a, b) => a.data.submittedAt.toMillis() - b.data.submittedAt.toMillis());
        return acc;
    }, {} as { [teamId: string]: { [questionId: string]: CollectionQueryItem<Answer>[] } });
    const questionAnsweredEarlier = (answerMeta: AnswerMeta) => {
        const answersByQuestion = answersByQuestionByTeam[answerMeta.answer.data.teamId];
        const answers = answersByQuestion[answerMeta.answer.data.questionId];
        for (const answer of answers) {
            if (answer.id === answerMeta.answer.id) {
                return false;
            } else if (answer.data.correct === true) {
                return true;
            }
        }
        return false;
    };
    const markAnswerWithScoreAndCorrect = (answerMeta: AnswerMeta, score: number, correct: boolean) => {
        if (!answerMeta.valid) {
            console.error(`Tried to mark invalid question as ${correct ? 'correct' : 'incorrect'} with ${score} points`, answerMeta);
            return;
        }
        markAnswer(
            quizId,
            answerMeta.answer.id,
            answerMeta.answer.data.teamId,
            correct,
            score,
        ).catch((error) => {
            console.error(`Error when marking answer ${answerMeta.answer.id} as ${correct ? 'correct' : 'incorrect'} with ${score} points`, error);
        });
    };
    const markCorrect = (answerMeta: AnswerMeta) => {
        const score = calculateScore(answerMeta.question, answerMeta.clueIndex);
        markAnswerWithScoreAndCorrect(answerMeta, score, true);
    };
    const markIncorrect = (answerMeta: AnswerMeta) => {
        markAnswerWithScoreAndCorrect(answerMeta, 0, false);
    };
    return (
        <div className={styles.answersHistory} data-cy="answers-history">
            {answerGroups.map((answerGroup, groupIndex) => (
                <div key={answerGroup.questionId}>
                    <h3>Question {groupIndex + 1}</h3>
                    {answerGroup.answerMetas.map((answerMeta) => (
                        <div
                            key={answerMeta.answer.id}
                            className={styles.answer + (answerMeta.valid ? '' : (' ' + styles.invalidAnswer))}
                            data-cy={`submitted-answer-${answerMeta.answer.id}`}
                        >
                            <div className={styles.answerInfo}>
                                {isQuizOwner && teamsById[answerMeta.answer.data.teamId] && <>{teamsById[answerMeta.answer.data.teamId].data.name}:<br/></>}
                                {answerMeta.answer.data.text}{' '}
                                {(answerMeta.answer.data.points !== undefined || !isQuizOwner) &&
                                    <>({answerMeta.answer.data.points !== undefined ? answerMeta.answer.data.points : 'unscored'})</>
                                }
                            </div>
                            {isQuizOwner && answerMeta.valid && !questionAnsweredEarlier(answerMeta) &&
                                <div>
                                    {answerMeta.answer.data.correct !== true && <PrimaryButton onClick={() => markCorrect(answerMeta)}>✔️</PrimaryButton>}
                                    {answerMeta.answer.data.correct !== false && <PrimaryButton onClick={() => markIncorrect(answerMeta)}>❌</PrimaryButton>}
                                </div>
                            }
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};