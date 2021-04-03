import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { PrimaryButton } from './Button';
import { useAnswersContext, useCluesContext, useQuestionsContext, useQuizContext, useTeamsContext, useWallInProgressContext } from './contexts/quizPage';
import { CollectionQueryItem } from './hooks/useCollectionResult';
import { Answer, Clue, FourByFourTextClue, getClueIds, Question, SimpleAnswer, WallAnswer, WallInProgress, WallQuestion } from './models';
import { AnswerUpdate, updateAnswers, updateWallAnswer } from './models/answer';
import styles from './AnswerHistory.module.css';
import { calculateUpdatedScores } from './answerScoreCalculator';
import { GenericErrorBoundary } from './GenericErrorBoundary';

function answerIsFullyVisible(answer: HTMLElement, container: HTMLElement): boolean {
    // The container and the answer have the same offsetParent (<body>), so we make the bounds relative
    // to the container's content (i.e. not just the visible portion)
    const answerBounds = {
        top: answer.offsetTop - container.offsetTop, // Answer's top within the container
        bottom: answer.offsetTop - container.offsetTop + answer.clientHeight, // Answer's bottom = top + height
    };
    const visibleBounds = {
        top: container.scrollTop, // Visible area starts at container's scrollTop
        bottom: container.scrollTop + container.clientHeight, // Visible area's bottom is top + height
    };

    return answerBounds.top >= visibleBounds.top && answerBounds.bottom <= visibleBounds.bottom;
}

export const AnswersHistory = ({ isQuizOwner }: { isQuizOwner: boolean; }) => {
    const { quizId, quiz } = useQuizContext();
    const { data: answersData, loading: answersLoading, error: answersError } = useAnswersContext();
    const { data: cluesData, loading: cluesLoading, error: cluesError } = useCluesContext();
    const { data: questionsData, loading: questionsLoading, error: questionsError } = useQuestionsContext();
    const { data: teamsData } = useTeamsContext();
    const { wipByTeamByClue: wallInProgressByTeamIdByClueId } = useWallInProgressContext();

    const historyContainerRef = useRef<HTMLElement|null>(null);
    const focusAnswerRef = useRef<HTMLElement|null>(null);
    useLayoutEffect(() => {
        if (!autoscrollEnabled.current) {
            return;
        }
        const answer = focusAnswerRef.current;
        const container = historyContainerRef.current;
        if (!answer || !container) {
            return;
        }
        if (!answerIsFullyVisible(answer, container)) {
            answer.scrollIntoView({ behavior: 'smooth' });
        }
    });

    const autoscrollEnabled = useRef(true);
    const updateAutoscroll = useCallback(() => {
        const answer = focusAnswerRef.current;
        const container = historyContainerRef.current;
        if (!container) {
            return;
        }
        const newValue = answer !== null && answerIsFullyVisible(answer, container);
        if (newValue !== autoscrollEnabled.current) {
            autoscrollEnabled.current = newValue;
        }
    }, []);
    const setHistoryContainerRef = useCallback((element: HTMLElement|null) => {
        if (historyContainerRef.current) {
            historyContainerRef.current.removeEventListener('scroll', updateAutoscroll);
        }

        historyContainerRef.current = element;

        if (historyContainerRef.current) {
            historyContainerRef.current.addEventListener('scroll', updateAutoscroll, { passive: true });
        }
    }, [updateAutoscroll]);
    useEffect(() => {
        return () => {
            if (historyContainerRef.current) {
                historyContainerRef.current.removeEventListener('scroll', updateAutoscroll);
            }
        };
    }, [updateAutoscroll]);

    const HistoryContainer: React.FunctionComponent<{}> = useCallback((props) => (
        <div className={styles.answersHistory} ref={setHistoryContainerRef} data-cy="answers-history">
            {props.children}
        </div>
    ), [setHistoryContainerRef]);

    if (answersError || cluesError || questionsError) {
        return <HistoryContainer><strong>There was an error loading your answers! Please try again</strong></HistoryContainer>;
    }
    if (answersLoading || !answersData || cluesLoading || !cluesData || questionsLoading || !questionsData) {
        return <HistoryContainer></HistoryContainer>;
    }

    const cluesById = Object.fromEntries(cluesData.map((clue) => [clue.id, clue]));
    const questionsById = Object.fromEntries(questionsData.map((question) => [question.id, question.data]));
    const teamNamesById = isQuizOwner && teamsData ? Object.fromEntries(teamsData.map((team) => [team.id, team.data.name])) : {};
    const answersByQuestionId = answersData.reduce((acc, answer) => {
        if (!acc[answer.data.questionId]) {
            acc[answer.data.questionId] = {};
        }
        if (!acc[answer.data.questionId][answer.data.clueId]) {
            acc[answer.data.questionId][answer.data.clueId] = [];
        }
        acc[answer.data.questionId][answer.data.clueId].push(answer);
        return acc;
    }, {} as { [questionId: string]: { [clueId: string]: CollectionQueryItem<Answer>[] }; });

    let focusAnswerId: string|undefined;
    if (!isQuizOwner) {
        focusAnswerId =  answersData[answersData.length - 1]?.id;
    } else {
        const orderedAnswers = quiz.questionIds.flatMap((qid) => {
            const question = questionsById[qid];
            const questionAnswersByClue = answersByQuestionId[qid];
            if (!questionAnswersByClue) {
                return [];
            } else {
                return getClueIds(question).flatMap((cid) => questionAnswersByClue[cid] || []);
            }
        });
        const firstUnmarked = orderedAnswers.find((a) => a.data.points === undefined);
        focusAnswerId = firstUnmarked?.id;
    }

    const updateAnswerScoresAndCorrectFlags = (answerUpdates: AnswerUpdate[]) => {
        updateAnswers(quizId, answerUpdates)
            .catch((error) => {
                console.error('Error when updating answers', error);
            });
    };

    const updateWallAnswerScoreAndCorrectFlag = (
        answerId: string,
        wallInProgressId: string,
        connectionIndex: number,
        connectionCorrect: boolean,
    ) => {
        updateWallAnswer(
            quizId,
            answerId,
            wallInProgressId,
            connectionIndex,
            connectionCorrect
        ).catch((error) => {
            console.error('Error when updating wall answer', error);
        });
    }

    const Answers = ({ questionId, groupIndex }: { questionId: string; groupIndex: number }) => {
        const question = questionsById[questionId] as Question|undefined;
        if (!question) {
            return null;
        }
        const questionAnswers = answersByQuestionId[questionId];
        if (question.type !== 'wall') {
            const clueIds = getClueIds(question);
            const questionAnswersGroupedByClue = clueIds.map((id) => ({
                answers: ((questionAnswers && questionAnswers[id]) || []) as CollectionQueryItem<SimpleAnswer>[],
                clueId: id,
            }));
            return (
                <AnswersForQuestion
                    key={questionId}
                    questionNumber={groupIndex + 1}
                    isQuizOwner={isQuizOwner}
                    question={question}
                    questionAnswersGroupedByClue={questionAnswersGroupedByClue}
                    cluesById={cluesById}
                    teamNamesById={teamNamesById}
                    updateAnswerScoresAndCorrectFlags={updateAnswerScoresAndCorrectFlags}
                    focusAnswerId={focusAnswerId}
                    focusAnswerRef={focusAnswerRef}
                /> 
            );
        } else {
            const clue = cluesById[question.clueId] as CollectionQueryItem<FourByFourTextClue>;
            const wallInProgressByTeam = wallInProgressByTeamIdByClueId && wallInProgressByTeamIdByClueId[question.clueId];
            const questionAnswersGroupedByClue = questionAnswers && questionAnswers[question.clueId] as CollectionQueryItem<WallAnswer>[];
            return (
                <AnswersForWallQuestion
                    key={questionId}
                    questionNumber={groupIndex + 1}
                    question={question}
                    clue={clue}
                    wallInProgressByTeam={wallInProgressByTeam || {}}
                    isQuizOwner={isQuizOwner}
                    teamNamesById={teamNamesById}
                    questionAnswers={questionAnswersGroupedByClue || []}
                    updateWallAnswerScoreAndCorrectFlag={updateWallAnswerScoreAndCorrectFlag}
                    focusAnswerId={focusAnswerId}
                    focusAnswerRef={focusAnswerRef}
                />
            );
        }
    };

    return (
        <HistoryContainer>
            <GenericErrorBoundary>
            {quiz.questionIds.map((questionId, groupIndex) => (
                <Answers key={questionId} questionId={questionId} groupIndex={groupIndex} />
            ))}
            </GenericErrorBoundary>
        </HistoryContainer>
    );
};

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

interface AnswersForQuestionProps {
    questionNumber: number;
    isQuizOwner: boolean;
    question: Question;
    questionAnswersGroupedByClue: { answers: CollectionQueryItem<SimpleAnswer>[]; clueId: string; }[];
    cluesById: { [clueId: string]: CollectionQueryItem<Clue>; };
    teamNamesById: { [teamId: string]: string; }
    focusAnswerId: string|undefined;
    focusAnswerRef: React.MutableRefObject<HTMLElement | null>;
    updateAnswerScoresAndCorrectFlags: (updates: AnswerUpdate[]) => void;
}
export const AnswersForQuestion = (props: AnswersForQuestionProps) => {
    const allQuestionAnswers = props.questionAnswersGroupedByClue.flatMap((answers) => answers.answers);
    if (allQuestionAnswers.length === 0) {
        return null;
    }

    const markCorrect = (answerId: string, clueIndex: number) => {
        const updates = calculateUpdatedScores(answerId, true, props.question, clueIndex, allQuestionAnswers);
        props.updateAnswerScoresAndCorrectFlags(updates);
    };
    const markIncorrect = (answerId: string, clueIndex: number) => {
        const updates = calculateUpdatedScores(answerId, false, props.question, clueIndex, allQuestionAnswers);
        props.updateAnswerScoresAndCorrectFlags(updates);
    };

    const hasAnsweredCorrectlyByTeam = Object.fromEntries(
        allQuestionAnswers
            .filter((answerItem) => answerItem.data.correct === true)
            .map((answerItem) => [answerItem.data.teamId, true])
    );
    const earlierAnswersAreUnmarked = (submittedAtMillis: number) => {
        return allQuestionAnswers.some((item) => {
            return item.data.correct === undefined && // Item is umarked...
                item.data.submittedAt && item.data.submittedAt.toMillis() < submittedAtMillis && // ...and prior to answer...
                hasAnsweredCorrectlyByTeam[item.data.teamId] !== true; // ...and not by a team with correct answer elsewhere...
        });
    };

    const answerInfoPropsGroupedByClue = props.questionAnswersGroupedByClue.map((questionAnswers) => {
        const markableAnswerPropsList = questionAnswers.answers.map((answerItem): Omit<MarkableAnswerProps, 'focusAnswerRef'|'focusAnswerId'> => {
            const clue = props.cluesById[answerItem.data.clueId];
            const valid = clue && answerIsValid(answerItem.data, clue.data);
    
            const clueIndex = (props.question.type === 'connection' || props.question.type === 'sequence') ? 
                props.question.clueIds.indexOf(answerItem.data.clueId) :
                0;
    
            const canBeMarkedCorrect = answerItem.data.correct !== true &&
                !(props.question.type === 'missing-vowels' && answerItem.data.submittedAt && earlierAnswersAreUnmarked(answerItem.data.submittedAt.toMillis()));
            const canBeMarkedIncorrect = answerItem.data.correct !== false;
            const buttonsAreVisible = props.isQuizOwner && valid && !allQuestionAnswers
                .some((a) => a.data.correct === true && a.data.teamId === answerItem.data.teamId && a.id !== answerItem.id);
            return {
                answer: {
                    id: answerItem.id,
                    text: answerItem.data.text,
                    isValid: valid,
                    points: answerItem.data.points,
                    teamName: props.teamNamesById[answerItem.data.teamId],
                },
                canBeMarkedCorrect,
                canBeMarkedIncorrect,
                buttonsAreVisible,
                cySuffix: answerItem.id,
                isQuizOwner: props.isQuizOwner,
                markCorrect: () => markCorrect(answerItem.id, clueIndex),
                markIncorrect: () => markIncorrect(answerItem.id, clueIndex),
            };
        });
        return { markableAnswerPropsList, clueId: questionAnswers.clueId };
    });

    const nonEmptyClueGroups = answerInfoPropsGroupedByClue.filter((group) => group.markableAnswerPropsList.length > 0);
    const clueGroupClassName = props.isQuizOwner ? styles.clueAnswerGroup : undefined;

    return (
        <div>
            <h3>Question {props.questionNumber}</h3>
            {nonEmptyClueGroups.map((clueGroup) => (
                <div key={clueGroup.clueId} className={clueGroupClassName}>
                    {clueGroup.markableAnswerPropsList.map((markableAnswerProps) => (
                        <MarkableAnswer
                            key={markableAnswerProps.cySuffix}
                            {...markableAnswerProps}
                            focusAnswerId={props.focusAnswerId}
                            focusAnswerRef={props.focusAnswerRef}
                         />
                    ))}
                </div>
            ))}
        </div>
    );
};

interface AnswersForWallQuestionProps {
    questionNumber: number;
    isQuizOwner: boolean;
    question: WallQuestion;
    clue: CollectionQueryItem<FourByFourTextClue>;
    wallInProgressByTeam: { [teamId: string]: CollectionQueryItem<WallInProgress> };
    questionAnswers: CollectionQueryItem<WallAnswer>[];
    teamNamesById: { [teamId: string]: string; };
    focusAnswerId: string | undefined;
    focusAnswerRef: React.MutableRefObject<HTMLElement | null>;
    updateWallAnswerScoreAndCorrectFlag: (
        answerId: string,
        wallInProgressId: string,
        connectionIndex: number,
        connectionCorrect: boolean,
    ) => void;
}
const AnswersForWallQuestion = (props: AnswersForWallQuestionProps) => {
    if (props.questionAnswers.length === 0) {
        return null;
    }
    return (
        <div>
            <h3>Question {props.questionNumber}</h3>
            {props.questionAnswers.map((answer) => (
                <AnswerForWallQuestion
                    key={answer.id}
                    answer={answer}
                    clue={props.clue}
                    teamNamesById={props.teamNamesById}
                    wallInProgressByTeam={props.wallInProgressByTeam}
                    isQuizOwner={props.isQuizOwner}
                    focusAnswerId={props.focusAnswerId}
                    focusAnswerRef={props.focusAnswerRef}
                    updateWallAnswerScoreAndCorrectFlag={props.updateWallAnswerScoreAndCorrectFlag}
                />
            ))}
        </div>
    );
};

interface AnswerForWallQuestionProps {
    answer: CollectionQueryItem<WallAnswer>;
    clue: CollectionQueryItem<FourByFourTextClue>;
    teamNamesById: { [teamId: string]: string; };
    wallInProgressByTeam: { [teamId: string]: CollectionQueryItem<WallInProgress> };
    isQuizOwner: boolean;
    focusAnswerId: string|undefined;
    focusAnswerRef: React.MutableRefObject<HTMLElement | null>;
    updateWallAnswerScoreAndCorrectFlag: (
        answerId: string,
        wallInProgressId: string,
        connectionIndex: number,
        connectionCorrect: boolean,
    ) => void;
}
const AnswerForWallQuestion = (props: AnswerForWallQuestionProps) => {
    const teamName = props.teamNamesById[props.answer.data.teamId];
    const wallInProgress = props.wallInProgressByTeam[props.answer.data.teamId];

    const markCorrect = (connectionIndex: number) => {
        props.updateWallAnswerScoreAndCorrectFlag(props.answer.id, wallInProgress.id, connectionIndex, true);
    };
    const markIncorrect = (connectionIndex: number) => {
        props.updateWallAnswerScoreAndCorrectFlag(props.answer.id, wallInProgress.id, connectionIndex, false);
    };

    const valid = answerIsValid(props.answer.data, props.clue.data);

    return (
        <div data-cy={`submitted-answer-${props.answer.id}`}>
            <h4>{teamName}</h4>
            <ConnectionsFound wallInProgress={wallInProgress} />
            <MarkableAnswersForWallAnswerGroup
                answer={props.answer}
                wallInProgress={wallInProgress}
                valid={valid}
                isQuizOwner={props.isQuizOwner}
                focusAnswerId={props.focusAnswerId}
                focusAnswerRef={props.focusAnswerRef}
                markCorrect={markCorrect}
                markIncorrect={markIncorrect}
            />
        </div>
    );
};

interface ConnectionsFoundProps {
    wallInProgress: CollectionQueryItem<WallInProgress> | undefined;
}
const ConnectionsFound = (props: ConnectionsFoundProps) => {
    if (!props.wallInProgress) {
        return null;
    }
    if (!props.wallInProgress.data.correctGroups) {
        return null;
    }
    return <div>Found {props.wallInProgress.data.correctGroups.length} group(s)</div>;
};

interface MarkableAnswersForWallAnswerGroupProps {
    answer: CollectionQueryItem<WallAnswer>;
    wallInProgress: CollectionQueryItem<WallInProgress> | undefined;
    valid: boolean;
    isQuizOwner: boolean;
    focusAnswerId: string|undefined;
    focusAnswerRef: React.MutableRefObject<HTMLElement | null>;
    markCorrect: (connectionIndex: number) => void;
    markIncorrect: (connectionIndex: number) => void;
}
const MarkableAnswersForWallAnswerGroup = (props: MarkableAnswersForWallAnswerGroupProps) => {
    const markableAnswerPropsList = props.answer.data.connections.map((connection, i) => {
        const infoProps: Omit<MarkableAnswerProps, 'focusAnswerId'|'focusAnswerRef'> = {
            answer: {
                id: props.answer.id,
                text: connection.text,
                isValid: props.valid,
                points: connection.correct === true ? 1 : (connection.correct === false ? 0 : undefined),
            },
            cySuffix: `${props.answer.id}-connection-${i}`,
            canBeMarkedCorrect: connection.correct !== true && props.wallInProgress !== undefined,
            canBeMarkedIncorrect: connection.correct !== false && props.wallInProgress !== undefined,
            buttonsAreVisible: props.isQuizOwner && props.valid && props.wallInProgress !== undefined,
            isQuizOwner: props.isQuizOwner,
            markCorrect: () => props.markCorrect(i),
            markIncorrect: () => props.markIncorrect(i),
        };
        return infoProps;
    });

    return (
        <>
            {markableAnswerPropsList.map((markableAnswerProps) =>
                <MarkableAnswer
                    key={markableAnswerProps.cySuffix}
                    {...markableAnswerProps}
                    focusAnswerId={props.focusAnswerId}
                    focusAnswerRef={props.focusAnswerRef}
                />
            )}
            Total: {props.answer.data.points || 0}
        </>
    );
};

interface MarkableAnswerProps {
    answer: {
        id: string;
        text: string;
        isValid: boolean;
        points?: number;
        teamName?: string;
    };
    cySuffix: string;
    isQuizOwner: boolean;
    buttonsAreVisible: boolean;
    canBeMarkedCorrect: boolean;
    canBeMarkedIncorrect: boolean;
    focusAnswerId: string|undefined;
    focusAnswerRef: React.MutableRefObject<HTMLElement | null>;
    markCorrect: () => void;
    markIncorrect: () => void;
}
const MarkableAnswer = (props: MarkableAnswerProps) => {
    return (
        <div
            className={props.answer.isValid ? styles.answer : styles.invalidAnswer}
            data-cy={`submitted-answer-${props.cySuffix}`}
            ref={(el) => { if (props.answer.id === props.focusAnswerId) { props.focusAnswerRef.current = el; } }}
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