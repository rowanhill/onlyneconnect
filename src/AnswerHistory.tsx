import React, { Fragment } from 'react';
import { PrimaryButton } from './Button';
import { useAnswersContext, useCluesContext, useQuestionsContext, useQuizContext, useTeamsContext } from './contexts/quizPage';
import { CollectionQueryItem } from './hooks/useCollectionResult';
import { Answer, Clue, FourByFourTextClue, Question, SimpleAnswer, WallAnswer, WallQuestion } from './models';
import { AnswerUpdate, updateAnswers } from './models/answer';
import styles from './AnswerHistory.module.css';
import { calculateUpdatedScores } from './answerScoreCalculator';

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
    const questionsById = Object.fromEntries(questionsData.map((question) => [question.id, question.data]));
    const teamNamesById = isQuizOwner && teamsData ? Object.fromEntries(teamsData.map((team) => [team.id, team.data.name])) : {};
    const answersByQuestionId = answersData.reduce((acc, answer) => {
        if (!acc[answer.data.questionId]) {
            acc[answer.data.questionId] = [];
        }
        acc[answer.data.questionId].push(answer);
        return acc;
    }, {} as { [questionId: string]: CollectionQueryItem<Answer>[] });

    const updateAnswerScoresAndCorrectFlags = (answerUpdates: AnswerUpdate[]) => {
        updateAnswers(quizId, answerUpdates)
            .catch((error) => {
                console.error('Error when updating answers', error);
            });
    };

    return (
        <div className={styles.answersHistory} data-cy="answers-history">
            {quiz.questionIds.map((questionId, groupIndex) => (
                questionsById[questionId]?.type !== 'wall' ?
                <AnswersForQuestion
                    key={questionId}
                    questionNumber={groupIndex + 1}
                    isQuizOwner={isQuizOwner}
                    question={questionsById[questionId]}
                    questionAnswers={answersByQuestionId[questionId] as CollectionQueryItem<SimpleAnswer>[] || []}
                    cluesById={cluesById}
                    teamNamesById={teamNamesById}
                    updateAnswerScoresAndCorrectFlags={updateAnswerScoresAndCorrectFlags}
                /> :
                <AnswersForWallQuestion
                    key={questionId}
                    questionNumber={groupIndex + 1}
                    question={questionsById[questionId] as WallQuestion}
                    clue={cluesById[(questionsById[questionId] as WallQuestion).clueId] as CollectionQueryItem<FourByFourTextClue>}
                    isQuizOwner={isQuizOwner}
                    teamNamesById={teamNamesById}
                    questionAnswers={answersByQuestionId[questionId] as CollectionQueryItem<WallAnswer>[] || []}
                    updateAnswerScoresAndCorrectFlags={updateAnswerScoresAndCorrectFlags}
                />
            ))}
        </div>
    );
};

interface AnswersForQuestionProps {
    questionNumber: number;
    isQuizOwner: boolean;
    question: Question;
    questionAnswers: CollectionQueryItem<SimpleAnswer>[];
    cluesById: { [clueId: string]: CollectionQueryItem<Clue>; };
    teamNamesById: { [teamId: string]: string; }
    updateAnswerScoresAndCorrectFlags: (updates: AnswerUpdate[]) => void;
}
export const AnswersForQuestion = (props: AnswersForQuestionProps) => {
    if (props.questionAnswers.length === 0) {
        return null;
    }

    const markCorrect = (answerId: string, clueIndex: number) => {
        const updates = calculateUpdatedScores(answerId, true, props.question, clueIndex, props.questionAnswers);
        props.updateAnswerScoresAndCorrectFlags(updates);
    };
    const markIncorrect = (answerId: string, clueIndex: number) => {
        const updates = calculateUpdatedScores(answerId, false, props.question, clueIndex, props.questionAnswers);
        props.updateAnswerScoresAndCorrectFlags(updates);
    };

    const hasAnsweredCorrectlyByTeam = Object.fromEntries(
        props.questionAnswers
            .filter((answerItem) => answerItem.data.correct === true)
            .map((answerItem) => [answerItem.data.teamId, true])
    );
    const earlierAnswersAreUnmarked = (submittedAtMillis: number) => {
        return props.questionAnswers.some((item) => {
            return item.data.correct === undefined && // Item is umarked...
                item.data.submittedAt.toMillis() < submittedAtMillis && // ...and prior to answer...
                hasAnsweredCorrectlyByTeam[item.data.teamId] !== true; // ...and not by a team with correct answer elsewhere...
        });
    };

    const answerInfoProps = props.questionAnswers.map((answerItem) => {
        const clue = props.cluesById[answerItem.data.clueId];
        const valid = clue && !!answerItem.data.submittedAt && !!clue.data.revealedAt &&
            answerItem.data.submittedAt.toMillis() >= clue.data.revealedAt.toMillis() &&
            (!clue.data.closedAt || answerItem.data.submittedAt.toMillis() <= clue.data.closedAt.toMillis());

        const clueIndex = (props.question.type === 'connection' || props.question.type === 'sequence') ? 
            props.question.clueIds.indexOf(answerItem.data.clueId) :
            0;

        const canBeMarkedCorrect = answerItem.data.correct !== true &&
            !(props.question.type === 'missing-vowels' && earlierAnswersAreUnmarked(answerItem.data.submittedAt.toMillis()));
        const canBeMarkedIncorrect = answerItem.data.correct !== false;
        const buttonsAreVisible = props.isQuizOwner && valid && !props.questionAnswers
            .some((a) => a.data.correct === true && a.data.teamId === answerItem.data.teamId && a.id !== answerItem.id);
        return {
            answerInfo: {
                id: answerItem.id,
                text: answerItem.data.text,
                isValid: valid,
                points: answerItem.data.points,
                teamName: props.teamNamesById[answerItem.data.teamId],
            },
            rest: {
                canBeMarkedCorrect,
                canBeMarkedIncorrect,
                buttonsAreVisible
            },
            clueIndex,
        }
    });

    return (
        <div>
            <h3>Question {props.questionNumber}</h3>
            {answerInfoProps.map((infoProps) => (
                <AnswerInfo
                    key={infoProps.answerInfo.id}
                    answer={infoProps.answerInfo}
                    {...infoProps.rest}
                    isQuizOwner={props.isQuizOwner}
                    markCorrect={() => markCorrect(infoProps.answerInfo.id, infoProps.clueIndex)}
                    markIncorrect={() => markIncorrect(infoProps.answerInfo.id, infoProps.clueIndex)}
                />
            ))}
        </div>
    );
};

interface AnswersForWallQuestionProps {
    questionNumber: number;
    isQuizOwner: boolean;
    question: WallQuestion;
    clue: CollectionQueryItem<FourByFourTextClue>;
    questionAnswers: CollectionQueryItem<WallAnswer>[];
    teamNamesById: { [teamId: string]: string; }
    updateAnswerScoresAndCorrectFlags: (updates: AnswerUpdate[]) => void;
}
const AnswersForWallQuestion = (props: AnswersForWallQuestionProps) => {
    return (
        <div>
            <h3>Question {props.questionNumber}</h3>
            {props.questionAnswers.map((answer) => (
                <Fragment key={answer.id}>
                    <h4>{props.teamNamesById[answer.data.teamId]}</h4>
                    {answer.data.groupsCorrect.map((groupCorrect, i) => 
                        <div key={i}>Group {i}: {groupCorrect ? 'Found' : 'Not found'}</div>
                    )}
                    <AnswerInfosForWallAnswer answer={answer} clue={props.clue} isQuizOwner={props.isQuizOwner} />
                </Fragment>
            ))}
        </div>
    );
};

interface AnswerInfosForWallAnswerProps {
    answer: CollectionQueryItem<WallAnswer>;
    clue: CollectionQueryItem<FourByFourTextClue>;
    isQuizOwner: boolean;
}
const AnswerInfosForWallAnswer = (props: AnswerInfosForWallAnswerProps) => {
    const answerInfoPropObjs = props.answer.data.connections.map((connection) => {
        const valid = !!props.answer.data.submittedAt &&
            !!props.clue.data.revealedAt && props.answer.data.submittedAt.toMillis() >= props.clue.data.revealedAt.toMillis() &&
            (!props.clue.data.closedAt || props.answer.data.submittedAt.toMillis() <= props.clue.data.closedAt.toMillis());
        const infoProps = {
            answer: {
                id: props.answer.id,
                text: connection.text,
                isValid: valid,
            } as AnswerInfoProps['answer'],
            canBeMarkedCorrect: connection.correct !== true,
            canBeMarkedIncorrect: connection.correct !== false,
        };
        if (connection.correct === true) {
            infoProps.answer!.points = 1;
        } else if (connection.correct === false) {
            infoProps.answer!.points = 0;
        }
        return infoProps;
    });

    return (
        <>
            {answerInfoPropObjs.map((answerInfoProps, i) =>
                <AnswerInfo
                    key={i}
                    {...answerInfoProps}
                    isQuizOwner={props.isQuizOwner}
                    buttonsAreVisible={true}
                    markCorrect={() => {}}
                    markIncorrect={() => {}}
                />
            )}
        </>
    );
};

interface AnswerInfoProps {
    answer: {
        id: string;
        text: string;
        isValid: boolean;
        points?: number;
        teamName?: string;
    };
    isQuizOwner: boolean;
    buttonsAreVisible: boolean;
    canBeMarkedCorrect: boolean;
    canBeMarkedIncorrect: boolean;
    markCorrect: () => void;
    markIncorrect: () => void;
}
const AnswerInfo = (props: AnswerInfoProps) => {
    return (
        <div
            key={props.answer.id}
            className={props.answer.isValid ? styles.answer : styles.invalidAnswer}
            data-cy={`submitted-answer-${props.answer.id}`}
        >
            <div className={styles.answerInfo}>
                {props.isQuizOwner && props.answer.teamName && <>{props.answer.teamName}:<br/></>}
                {props.answer.text}{' '}
                {(props.answer.points !== undefined || !props.isQuizOwner) &&
                    <>({props.answer.points !== undefined ? props.answer.points : 'unscored'})</>
                }
            </div>
            {props.buttonsAreVisible &&
                <div className={styles.markingButtons}>
                    <PrimaryButton onClick={props.markCorrect} disabled={!props.canBeMarkedCorrect}>✔️</PrimaryButton>
                    <PrimaryButton onClick={props.markIncorrect} disabled={!props.canBeMarkedIncorrect}>❌</PrimaryButton>
                </div>
            }
        </div>
    );
};