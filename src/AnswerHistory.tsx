import React from 'react';
import { PrimaryButton } from './Button';
import { useAnswersContext, useCluesContext, useQuestionsContext, useQuizContext, useTeamsContext, useWallInProgressContext } from './contexts/quizPage';
import { CollectionQueryData } from './hooks/useCollectionResult';
import { Answer, Clue, Question, Quiz, Team } from './models';
import { AnswerUpdate, updateAnswers, updateWallAnswer } from './models/answer';
import styles from './AnswerHistory.module.css';
import { GenericErrorBoundary } from './GenericErrorBoundary';
import { useAutoscroll } from './hooks/useAutoscroll';
import { createViewModel, VMAnswer, VMAnswerGroup, VMQuestion, VMSimpleAnswerGroup, VMWallAnswerGroup } from './answerHistoryViewModel';

const HistoryContainer: React.FunctionComponent<{ setHistoryContainerRef: (element: HTMLElement | null) => void; }> = (props) => (
    <div className={styles.answersHistory} ref={props.setHistoryContainerRef} data-cy="answers-history">
        {props.children}
    </div>
);

export const AnswersHistory = ({ isQuizOwner }: { isQuizOwner: boolean; }) => {
    const { quizId, quiz } = useQuizContext();
    const { data: answersData, loading: answersLoading, error: answersError } = useAnswersContext();
    const { data: cluesData, loading: cluesLoading, error: cluesError } = useCluesContext();
    const { data: questionsData, loading: questionsLoading, error: questionsError } = useQuestionsContext();
    const { data: teamsData } = useTeamsContext();
    const { wipByTeamByClue: wallInProgressByTeamIdByClueId } = useWallInProgressContext();

    const { setContainerRef: setHistoryContainerRef, targetRef: focusAnswerRef } = useAutoscroll();

    if (answersError || cluesError || questionsError) {
        return <HistoryContainer setHistoryContainerRef={setHistoryContainerRef}><strong>There was an error loading your answers! Please try again</strong></HistoryContainer>;
    }
    if (answersLoading || !answersData || cluesLoading || !cluesData || questionsLoading || !questionsData || !teamsData) {
        return <HistoryContainer setHistoryContainerRef={setHistoryContainerRef}></HistoryContainer>;
    }

    return <AnswersHistoryInner
        isQuizOwner={isQuizOwner}
        quizId={quizId}
        quiz={quiz}
        cluesData={cluesData}
        questionsData={questionsData}
        teamsData={teamsData}
        answersData={answersData}
        wallInProgressByTeamIdByClueId={wallInProgressByTeamIdByClueId}
        focusAnswerRef={focusAnswerRef}
        setHistoryContainerRef={setHistoryContainerRef}
    />;
};

interface AnswersHistoryInnerProps {
    isQuizOwner: boolean;
    quizId: string;
    quiz: Quiz;
    cluesData: CollectionQueryData<Clue>;
    questionsData: CollectionQueryData<Question>;
    teamsData: CollectionQueryData<Team>;
    answersData: CollectionQueryData<Answer>;
    wallInProgressByTeamIdByClueId: ReturnType<typeof useWallInProgressContext>['wipByTeamByClue'];
    focusAnswerRef: React.MutableRefObject<HTMLElement | null>;
    setHistoryContainerRef: (element: HTMLElement | null) => void;
}
const AnswersHistoryInner = ({
    isQuizOwner,
    quizId,
    quiz,
    cluesData,
    questionsData,
    teamsData,
    answersData,
    focusAnswerRef,
    wallInProgressByTeamIdByClueId,
    setHistoryContainerRef,
}: AnswersHistoryInnerProps) => {
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
    };

    const viewModel = createViewModel(
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

    const setFocusAnswerRefIfFocusAnswerId = (answerId: string) => (el: HTMLElement | null) => {
        if (answerId === viewModel.focusAnswerId) {
            focusAnswerRef.current = el;
        }
    };

    return (
        <HistoryContainer setHistoryContainerRef={setHistoryContainerRef}>
            <GenericErrorBoundary>
                {viewModel.questions.map((question, questionIndex) => (
                    question.numAnswers > 0 && <QuestionGroup
                        key={question.id}
                        model={question}
                        questionNumber={questionIndex + 1}
                        isQuizOwner={isQuizOwner}
                        setFocusAnswerRefIfFocusAnswerId={setFocusAnswerRefIfFocusAnswerId}
                    />
                ))}
            </GenericErrorBoundary>
        </HistoryContainer>
    );
};

export const QuestionGroup = ({ model, questionNumber, isQuizOwner, setFocusAnswerRefIfFocusAnswerId }: {
    model: VMQuestion;
    questionNumber: number;
    isQuizOwner: boolean;
    setFocusAnswerRefIfFocusAnswerId: (answerId: string) => (el: HTMLElement | null) => void;
}) => {
    return (
        <div>
            <h3>Question {questionNumber}</h3>
            {model.clueGroups.map((clueGroup) => (
                clueGroup.numAnswers > 0 && <div key={clueGroup.id} className={isQuizOwner ? styles.clueAnswerGroup : undefined}>
                    {clueGroup.answerGroups.map((answer) => (
                        <AnswerGroup
                            key={answer.id}
                            model={answer}
                            isQuizOwner={isQuizOwner}
                            setFocusAnswerRefIfFocusAnswerId={setFocusAnswerRefIfFocusAnswerId}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
};

const AnswerGroup = ({ model, isQuizOwner, setFocusAnswerRefIfFocusAnswerId }: {
    model: VMAnswerGroup;
    isQuizOwner: boolean;
    setFocusAnswerRefIfFocusAnswerId: (answerId: string) => (el: HTMLElement | null) => void;
}) => {
    if (model.type === 'simple') {
        return <SimpleAnswerRow
            model={model}
            isQuizOwner={isQuizOwner}
            setFocusAnswerRefIfFocusAnswerId={setFocusAnswerRefIfFocusAnswerId}
        />;
    } else {
        return <WallAnswerRow
            model={model}
            isQuizOwner={isQuizOwner}
            setFocusAnswerRefIfFocusAnswerId={setFocusAnswerRefIfFocusAnswerId}
        />;
    }
};

const SimpleAnswerRow = ({ model, isQuizOwner, setFocusAnswerRefIfFocusAnswerId }: {
    model: VMSimpleAnswerGroup;
    isQuizOwner: boolean;
    setFocusAnswerRefIfFocusAnswerId: (answerId: string) => (el: HTMLElement | null) => void;
}) => {
    return (
        <MarkableAnswer
            answerGroupModel={model}
            answerModel={model.answer}
            cySuffix={model.id}
            isQuizOwner={isQuizOwner}
            setFocusAnswerRefIfFocusAnswerId={setFocusAnswerRefIfFocusAnswerId}
        />
    );
};

const WallAnswerRow = ({ model, isQuizOwner, setFocusAnswerRefIfFocusAnswerId }: {
    model: VMWallAnswerGroup;
    isQuizOwner: boolean;
    setFocusAnswerRefIfFocusAnswerId: (answerId: string) => (el: HTMLElement | null) => void;
}) => {
    return (
        <div data-cy={`submitted-answer-${model.id}`}>
            {isQuizOwner && model.teamName && <h4>{model.teamName}</h4>}
            <ConnectionsFound numGroupsFound={model.numGroupsFound} />
            {model.connections.map((connection, connectionIndex) => (
                <MarkableAnswer
                    key={`${model.id}-connection-${connectionIndex}`}
                    answerGroupModel={{ ...model, teamName: undefined }}
                    answerModel={connection}
                    cySuffix={`${model.id}-connection-${connectionIndex}`}
                    isQuizOwner={isQuizOwner}
                    setFocusAnswerRefIfFocusAnswerId={setFocusAnswerRefIfFocusAnswerId}
                />
            ))}
            Total: {model.totalPoints}
        </div>
    );
};

interface ConnectionsFoundProps {
    numGroupsFound: number;
}
const ConnectionsFound = (props: ConnectionsFoundProps) => {
    return <div>Found {props.numGroupsFound} group(s)</div>;
};

const MarkableAnswer = ({ answerModel, answerGroupModel, cySuffix, isQuizOwner, setFocusAnswerRefIfFocusAnswerId }: {
    answerModel: VMAnswer;
    answerGroupModel: VMAnswerGroup;
    cySuffix: string;
    isQuizOwner: boolean;
    setFocusAnswerRefIfFocusAnswerId: (answerId: string) => (el: HTMLElement | null) => void;
}) => {
    return (
        <div
            className={answerGroupModel.isValid ? styles.answer : styles.invalidAnswer}
            data-cy={`submitted-answer-${cySuffix}`}
            ref={setFocusAnswerRefIfFocusAnswerId(answerGroupModel.id)}
        >
            <div className={styles.answerInfo}>
                {isQuizOwner && answerGroupModel.teamName && <>{answerGroupModel.teamName}:<br/></>}
                {answerModel.text}{' '}
                {(answerModel.points !== undefined || !isQuizOwner) &&
                    <>({answerModel.points !== undefined ? answerModel.points : 'unscored'})</>
                }
            </div>
            {isQuizOwner && answerModel.marking && !answerModel.marking.supercededByCorrectAnswer && answerGroupModel.isValid &&
                <div className={styles.markingButtons}>
                    <PrimaryButton onClick={answerModel.marking.markCorrect} disabled={!answerModel.marking.canBeMarkedCorrect}>✔️</PrimaryButton>
                    <PrimaryButton onClick={answerModel.marking.markIncorrect} disabled={!answerModel.marking.canBeMarkedIncorrect}>❌</PrimaryButton>
                </div>
            }
        </div>
    );
};