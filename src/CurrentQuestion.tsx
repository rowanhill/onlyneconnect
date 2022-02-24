import React from 'react';
import { Card } from './Card';
import { useCluesContext, usePlayerTeamContext, useQuestionsContext, useQuestionSecretsContext, useQuizContext, useWallInProgressContext } from './contexts/quizPage';
import { CollectionQueryItem } from './hooks/useCollectionResult';
import { CompoundTextClue, ConnectionQuestion, ConnectionSecrets, FourByFourTextClue, MissingVowelsQuestion, MissingVowelsSecrets, Question, QuestionSecrets, SequenceQuestion, SequenceSecrets, TextClue, throwBadQuestionType, WallQuestion, WallSecrets } from './models';
import { VisibleClue, HiddenClue, LastInSequenceClue } from './components/clues/Clues';
import { WallClues } from './components/clues/WallClues';
import styles from './CurrentQuestion.module.css';
import { GenericErrorBoundary } from './GenericErrorBoundary';

export const CurrentQuestion = ({ currentQuestionItem }: { currentQuestionItem?: CollectionQueryItem<Question>; }) => {
    const { error: questionsError } = useQuestionsContext();
    const { quiz } = useQuizContext();
    const { data: secrets } = useQuestionSecretsContext();
    
    function inner() {
        if (currentQuestionItem === undefined) {
            return <>Waiting for quiz to start...</>;
        }
        if (questionsError) {
            return <strong>There was an error loading the question! Please try again.</strong>;
        }
        if (quiz.isComplete) {
            return <>That's the end of the quiz. Thanks for playing!</>;
        }
        const currentQuestionNumber = quiz.questionIds.findIndex((questionId) => questionId === currentQuestionItem.id) + 1;
        const currentSecret = secrets && secrets.find((s) => s.id === currentQuestionItem.id);
        return (
            <>
                <h3>Question {currentQuestionNumber}</h3>
                <QuestionInstructions currentQuestionItem={currentQuestionItem} />
                <QuestionClues currentQuestionItem={currentQuestionItem} currentSecret={currentSecret} />
                <QuestionConnection currentQuestionItem={currentQuestionItem} currentSecret={currentSecret} />
            </>
        );
    }
    return <Card className={styles.questionPanel} data-cy="clue-holder"><GenericErrorBoundary>{inner()}</GenericErrorBoundary></Card>;
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
                .map((id) => questionCluesById[id])
                .filter((clue) => !!clue);
            if (currentQuestionItem.data.type === 'connection') {
                return (<ConnectionClues clues={orderedClues as Array<CollectionQueryItem<TextClue>>} />);
            } else {
                return (<SequenceClues
                    clues={orderedClues as Array<CollectionQueryItem<TextClue>>}
                    question={currentQuestionItem as CollectionQueryItem<SequenceQuestion>}
                    secret={currentSecret as CollectionQueryItem<SequenceSecrets> | undefined}
                />);
            }
        case 'wall':
            return (<WallClues
                    clue={questionCluesById[currentQuestionItem.data.clueId] as CollectionQueryItem<FourByFourTextClue>}
                />);
        case 'missing-vowels':
            return (<MissingVowelsClues clue={questionCluesById[currentQuestionItem.data.clueId] as CollectionQueryItem<CompoundTextClue>} />);
        default:
            throwBadQuestionType(currentQuestionItem.data);
    }
};

const ConnectionClues = ({ clues }: { clues: Array<CollectionQueryItem<TextClue>> }) => {
    return (
        <div className={styles.cluesHolder}>
            {clues.map((clue, i) => (
                <VisibleClue key={clue.id} isRevealed={clue.data.isRevealed} text={clue.data.text} index={i} />
            ))}
            {arrayUpTo(4 - clues.length).map((n) => (
                <HiddenClue key={n} />
            ))}
        </div>
    );
};

const SequenceClues = ({ question, clues, secret }: {
    question: CollectionQueryItem<SequenceQuestion>;
    clues: Array<CollectionQueryItem<TextClue>>;
    secret: CollectionQueryItem<SequenceSecrets> | undefined;
}) => {
    return (
        <div className={styles.cluesHolder}>
            {clues.map((clue, i) => (
                <VisibleClue key={clue.id} isRevealed={clue.data.isRevealed} text={clue.data.text} index={i} />
            ))}
            {clues.length === 3 &&
                <LastInSequenceClue
                    allOtherCluesRevealed={!clues.some((c) => !c.data.isRevealed)}
                    example={question.data.exampleLastInSequence}
                    exampleFromSecret={secret?.data.exampleLastInSequence}
                />
            }
            {clues.length < 3 && arrayUpTo(4 - clues.length).map((n) => (
                <HiddenClue key={n} />
            ))}
        </div>
    );
};

const MissingVowelsClues = ({ clue }: { clue: CollectionQueryItem<CompoundTextClue>; }) => {
    return (
        <div className={styles.cluesHolder}>
            {clue.data.texts.map((text, i) => 
                <VisibleClue key={i} isRevealed={clue.data.isRevealed} text={text} index={i} />
            )}
        </div>
    );
};

const QuestionConnection = ({ currentQuestionItem, currentSecret }: { currentQuestionItem: CollectionQueryItem<Question>; currentSecret: CollectionQueryItem<QuestionSecrets>|undefined; }) => {
    switch (currentQuestionItem.data.type) {
        case 'connection':
        case 'sequence':
        case 'missing-vowels':
            return (<SingleConnection
                currentQuestionItem={currentQuestionItem as CollectionQueryItem<ConnectionQuestion|SequenceQuestion|MissingVowelsQuestion>}
                secretsItem={currentSecret as CollectionQueryItem<ConnectionSecrets|SequenceSecrets|MissingVowelsSecrets> | undefined}
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

const SingleConnection = ({ currentQuestionItem, secretsItem }: {
    currentQuestionItem: CollectionQueryItem<ConnectionQuestion|SequenceQuestion|MissingVowelsQuestion>;
    secretsItem: CollectionQueryItem<ConnectionSecrets|SequenceSecrets|MissingVowelsSecrets> | undefined;
}) => {
    if (currentQuestionItem.data.connection) {
        return (
            <div className={styles.revealedConnection}>{currentQuestionItem.data.connection}</div>
        );
    } else if (secretsItem) {
        return (
            <div className={styles.unrevealedConnection}>({secretsItem.data.connection})</div>
        );
    } else {
        return null;
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

    const groupClassName = (i: number) => {
        if (currentQuestionItem.data.connections) {
            return `group${i + 1}`;
        } else {
            return 'unrevealedGroup';
        }
    };
    const text = (connection: string) => {
        if (currentQuestionItem.data.connections) {
            return connection;
        } else {
            return `(${connection})`;
        }
    }
    return (
        <div className={styles.connections}>
            {connections.map((con, i) =>
                <div className={styles.groupConnection + ' ' + styles[groupClassName(i)]} key={con}>{text(con)}</div>
            )}
        </div>
    );
};

function arrayUpTo(n: number) {
    return Array.from(Array(n).keys());
}