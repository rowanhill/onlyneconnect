import React from 'react';
import { Card } from './Card';
import { useCluesContext, useQuestionsContext, useQuizContext } from './contexts/quizPage';
import { CollectionQueryItem } from './hooks/useCollectionResult';
import { CompoundTextClue, FourByFourTextClue, Question, TextClue, throwBadQuestionType } from './models';
import { VisibleClue, HiddenClue, LastInSequenceClue } from './Clues';
import { WallClues } from './WallClues';
import styles from './CurrentQuestion.module.css';

export const CurrentQuestion = ({ currentQuestionItem }: { currentQuestionItem?: CollectionQueryItem<Question>; }) => {
    const { error: questionsError } = useQuestionsContext();
    const { quiz } = useQuizContext();
    function inner() {
        if (currentQuestionItem === undefined) {
            return <>Waiting for quiz to start...</>;
        }
        if (questionsError) {
            return <strong>There was an error loading the question! Please try again.</strong>;
        }
        const currentQuestionNumber = quiz.questionIds.findIndex((questionId) => questionId === currentQuestionItem.id) + 1;
        return (
            <>
                <h3>Question {currentQuestionNumber}</h3>
                <QuestionInstructions currentQuestionItem={currentQuestionItem} />
                <QuestionClues currentQuestionItem={currentQuestionItem} />
            </>
        );
    }
    return <Card className={styles.questionPanel} data-cy="clue-holder">{inner()}</Card>;
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

const QuestionClues = ({ currentQuestionItem }: { currentQuestionItem: CollectionQueryItem<Question>; }) => {
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
                return (<SequenceClues clues={orderedClues as Array<CollectionQueryItem<TextClue>>} />);
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

const SequenceClues = ({ clues }: { clues: Array<CollectionQueryItem<TextClue>> }) => {
    return (
        <div className={styles.cluesHolder}>
            {clues.map((clue, i) => (
                <VisibleClue key={clue.id} isRevealed={clue.data.isRevealed} text={clue.data.text} index={i} />
            ))}
            {clues.length === 3 && <LastInSequenceClue allOtherCluesRevealed={!clues.some((c) => !c.data.isRevealed)} />}
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

function arrayUpTo(n: number) {
    return Array.from(Array(n).keys());
}