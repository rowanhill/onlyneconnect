import React from 'react';
import { PrimaryButton } from './Button';
import { useAnswersContext, useCluesContext, useQuestionsContext, useQuizContext, useTeamsContext } from './contexts/quizPage';
import { CollectionQueryItem } from './hooks/useCollectionResult';
import { Answer, Question } from './models';
import { AnswerUpdate, updateAnswers } from './models/answer';
import styles from './AnswerHistory.module.css';
import { calculateUpdatedScores } from './answerScoreCalculator';

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
        const clueIndex = (question.data.type === 'connection' || question.data.type === 'sequence') ? 
            question.data.clueIds.indexOf(answer.data.clueId) :
            0;
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
        acc[answer.data.teamId][answer.data.questionId].sort((a, b) => {
            if (!a.data.submittedAt && !b.data.submittedAt) {
                return 0;
            } else if (!b.data.submittedAt) {
                return 1;
            } else if (!a.data.submittedAt) {
                return -1;
            }
            return a.data.submittedAt.toMillis() - b.data.submittedAt.toMillis();
        });
        return acc;
    }, {} as { [teamId: string]: { [questionId: string]: CollectionQueryItem<Answer>[] } });

    // True if the team has already answered this question correctly via a different answer
    const questionAnsweredCorrectlyElsewhereByTeam = (answerMeta: AnswerMeta) => {
        const answersByQuestion = answersByQuestionByTeam[answerMeta.answer.data.teamId];
        const answers = answersByQuestion[answerMeta.answer.data.questionId];
        return answers.some((a) => a.data.correct === true && a.id !== answerMeta.answer.id);
    }

    // True if there are any previously submitted answers that have yet to be marked
    const earlierAnswersAreUnmarked = (answerMeta: AnswerMeta) => {
        const previousQuestions = answersData
            .filter((item) => item.data.submittedAt.toMillis() < answerMeta.answer.data.submittedAt.toMillis());
        return previousQuestions.some((item) => item.data.correct === undefined);
    };

    const canBeMarkedCorrect = (answerMeta: AnswerMeta) => {
        if (answerMeta.answer.data.correct === true) {
            return false;
        }
        if (answerMeta.question.type === 'missing-vowels' && earlierAnswersAreUnmarked(answerMeta)) {
            return false;
        }
        return true;
    };
    const canBeMarkedIncorrect = (answerMeta: AnswerMeta) => {
        if (answerMeta.answer.data.correct === false) {
            return false;
        }
        return true;
    }

    const updateAnswerScoresAndCorrectFlags = (answerUpdates: AnswerUpdate[]) => {
        updateAnswers(quizId, answerUpdates)
            .catch((error) => {
                console.error('Error when updating answers', error);
            });
    };
    const markCorrect = (answerMeta: AnswerMeta) => {
        const updates = calculateUpdatedScores(answerMeta.answer, true, answerMeta.question, answerMeta.clueIndex, answersData);
        updateAnswerScoresAndCorrectFlags(updates);
    };
    const markIncorrect = (answerMeta: AnswerMeta) => {
        const updates = calculateUpdatedScores(answerMeta.answer, false, answerMeta.question, answerMeta.clueIndex, answersData);
        updateAnswerScoresAndCorrectFlags(updates);
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
                            {isQuizOwner && answerMeta.valid && !questionAnsweredCorrectlyElsewhereByTeam(answerMeta) &&
                                <div>
                                    <PrimaryButton onClick={() => markCorrect(answerMeta)} disabled={!canBeMarkedCorrect(answerMeta)}>✔️</PrimaryButton>
                                    <PrimaryButton onClick={() => markIncorrect(answerMeta)} disabled={!canBeMarkedIncorrect(answerMeta)}>❌</PrimaryButton>
                                </div>
                            }
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};