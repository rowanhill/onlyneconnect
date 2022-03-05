import React, { ReactNode } from 'react';
import { Card } from './Card';
import { useCluesContext, usePlayerTeamContext, useQuestionsContext, useQuestionSecretsContext, useQuizContext, useWallInProgressContext } from './contexts/quizPage';
import { CollectionQueryItem } from './hooks/useCollectionResult';
import { CompoundTextClue, ConnectionSecrets, Four, FourByFourTextClue, MissingVowelsSecrets, Question, QuestionSecrets, SequenceSecrets, TextClue, throwBadQuestionType, WallQuestion, WallSecrets } from './models';
import { WallClues } from './components/clues/WallClues';
import styles from './CurrentQuestion.module.css';
import { GenericErrorBoundary } from './GenericErrorBoundary';
import { ConnectionClues, MissingVowelsClues, SequenceClues } from './components/clues/ClueHolders';
import { SingleQuestionConnection } from './components/questionConnections/SingleQuestionConnection';
import { WallQuestionConnections } from './components/questionConnections/WallQuestionConnections';

export const CurrentQuestion = ({ currentQuestionItem }: { currentQuestionItem?: CollectionQueryItem<Question>; }) => {
    const { error: questionsError } = useQuestionsContext();
    const { quiz } = useQuizContext();
    const { data: secrets } = useQuestionSecretsContext();
    
    let inner: ReactNode;
    let title: string|undefined = undefined;
    const cardClassNames = [styles.questionPanel];
    if (currentQuestionItem === undefined) {
        cardClassNames.push(styles.questionNotLive);
        inner = <span className={styles.questionInfoMessage}>Waiting for quiz to start...</span>;
    } else if (questionsError) {
        cardClassNames.push(styles.questionNotLive);
        inner = <span className={styles.questionInfoMessage}><strong>There was an error loading the question! Please try again.</strong></span>;
    } else if (quiz.isComplete) {
        cardClassNames.push(styles.questionNotLive);
        inner = <span className={styles.questionInfoMessage}>That's the end of the quiz. Thanks for playing!</span>;
    } else {
        const currentQuestionNumber = quiz.questionIds.findIndex((questionId) => questionId === currentQuestionItem.id) + 1;
        const currentSecret = secrets && secrets.find((s) => s.id === currentQuestionItem.id);
        title = `Question ${currentQuestionNumber}`;
        inner = (
            <>
                <QuestionInstructions currentQuestionItem={currentQuestionItem} />
                <QuestionClues currentQuestionItem={currentQuestionItem} currentSecret={currentSecret} />
                <QuestionConnection currentQuestionItem={currentQuestionItem} currentSecret={currentSecret} />
            </>
        );
    }
    return (
        <Card className={cardClassNames.join(' ')} title={title} data-cy="clue-holder">
            <GenericErrorBoundary>
                {inner}
            </GenericErrorBoundary>
        </Card>
    );
};

const QuestionInstructions = ({ currentQuestionItem }: { currentQuestionItem: CollectionQueryItem<Question>; }) => {
    switch (currentQuestionItem.data.type) {
        case 'connection':
            return <h4>Connection: what links these things?</h4>;
        case 'sequence':
            return <h4>Sequence: what comes fourth?</h4>;
        case 'wall':
            return <h4>Wall: what four connections group these things into sets of four?</h4>
        case 'missing-vowels':
            return <h4>Missing Vowels: what links these things?</h4>;
        default:
            throwBadQuestionType(currentQuestionItem.data);
    }
};

const QuestionClues = ({ currentQuestionItem, currentSecret }: { currentQuestionItem: CollectionQueryItem<Question>; currentSecret: CollectionQueryItem<QuestionSecrets>|undefined; }) => {
    const { data: clues, loading, error } = useCluesContext();
    if (error) {
        return <strong>There was an error loading the clues! Please try again</strong>;
    }
    if (loading) {
        return <>Loading clues</>;
    }
    const questionClues = clues?.filter((clue) => clue.data.questionId === currentQuestionItem.id);
    if (!questionClues || questionClues.length === 0) {
        return <>Waiting for question to start...</>;
    }
    const questionCluesById = Object.fromEntries(questionClues.map((clue) => [clue.id, clue]));

    switch (currentQuestionItem.data.type) {
        case 'connection':
        case 'sequence':
            const orderedClues = currentQuestionItem.data.clueIds
                .map((id) => questionCluesById[id] as CollectionQueryItem<TextClue>)
                .filter((clue) => !!clue);
            if (currentQuestionItem.data.type === 'connection') {
                return (<ConnectionClues clues={orderedClues} />);
            } else {
                return (<SequenceClues
                    clues={orderedClues}
                    questionExample={currentQuestionItem.data.exampleLastInSequence}
                    secretExample={(currentSecret as CollectionQueryItem<SequenceSecrets>)?.data.exampleLastInSequence}
                />);
            }
        case 'wall':
            return (<WallClues
                    clue={questionCluesById[currentQuestionItem.data.clueId] as CollectionQueryItem<FourByFourTextClue>}
                />);
        case 'missing-vowels':
            return (<MissingVowelsClues clue={questionCluesById[currentQuestionItem.data.clueId].data as CompoundTextClue} />);
        default:
            throwBadQuestionType(currentQuestionItem.data);
    }
};

const QuestionConnection = ({ currentQuestionItem, currentSecret }: { currentQuestionItem: CollectionQueryItem<Question>; currentSecret: CollectionQueryItem<QuestionSecrets>|undefined; }) => {
    switch (currentQuestionItem.data.type) {
        case 'connection':
        case 'sequence':
        case 'missing-vowels':
            const singleSecret = currentSecret as CollectionQueryItem<ConnectionSecrets|SequenceSecrets|MissingVowelsSecrets> | undefined;
            return (<SingleQuestionConnection
                questionConnection={currentQuestionItem.data.connection}
                secretsConnection={singleSecret?.data.connection}
            />);
        case 'wall':
            return (<WallConnections
                currentQuestionItem={currentQuestionItem as CollectionQueryItem<WallQuestion>}
                secretsItem={currentSecret as CollectionQueryItem<WallSecrets> | undefined}
            />);
        default:
            throwBadQuestionType(currentQuestionItem.data);
    }
};

const WallConnections = ({ currentQuestionItem, secretsItem }: {
    currentQuestionItem: CollectionQueryItem<WallQuestion>;
    secretsItem: CollectionQueryItem<WallSecrets> | undefined;
}) => {
    const { teamId } = usePlayerTeamContext();
    const { wipByTeamByClue } = useWallInProgressContext();
    const { data: clues } = useCluesContext();
    if (!currentQuestionItem.data.connections && !secretsItem) {
        return null;
    }
    const solutionConnections = currentQuestionItem.data.connections || secretsItem!.data.connections;
    const clue = clues?.find((c) => c.data.questionId === currentQuestionItem.id);
    const progress = (teamId && wipByTeamByClue && clue && wipByTeamByClue[clue.id]) ? wipByTeamByClue[clue.id][teamId] : undefined;

    const connections = [];
    if (progress && progress.data.correctGroups) {
        for (const { solutionGroupIndex } of progress.data.correctGroups) {
            connections.push(solutionConnections[solutionGroupIndex]);
        }
        let solutionGroupIndex = 0;
        const isGroupFactory = (solutionGroupIndex: number) => (group: { solutionGroupIndex: number }): boolean => {
            return group.solutionGroupIndex === solutionGroupIndex;
        }
        for (const connection of solutionConnections) {
            const isGroup = isGroupFactory(solutionGroupIndex);
            if (!progress.data.correctGroups.some((g) => isGroup(g))) {
                connections.push(connection);
            }
            solutionGroupIndex++;
        }
    } else {
        for (const connection of solutionConnections) {
            connections.push(connection);
        }
    }

    return <WallQuestionConnections connections={connections as Four<string>} isRevealed={!!currentQuestionItem.data.connections} />;
};