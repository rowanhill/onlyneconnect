import { Card } from './Card';
import { useCluesContext, useQuestionsContext } from './contexts/quizPage';
import { CollectionQueryItem } from './hooks/useCollectionResult';
import { CompoundTextClue, Question, TextClue, throwBadQuestionType } from './models';
import styles from './CurrentQuestion.module.css';

export const CurrentQuestion = ({ currentQuestionItem }: { currentQuestionItem?: CollectionQueryItem<Question>; }) => {
    const { error: questionsError } = useQuestionsContext();
    function inner() {
        if (currentQuestionItem === undefined) {
            return <>Waiting for quiz to start...</>;
        }
        if (questionsError) {
            return <strong>There was an error loading the question! Please try again.</strong>;
        }
        return <QuestionClues currentQuestionItem={currentQuestionItem} />;
    }
    return <Card className={styles.questionPanel} data-cy="clue-holder">{inner()}</Card>;
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
        case 'missing-vowels':
            return (<MissingVowelsClues clue={questionCluesById[currentQuestionItem.data.clueId] as CollectionQueryItem<CompoundTextClue>} />)
        default:
            throwBadQuestionType(currentQuestionItem.data);
    }
};

const ConnectionClues = ({ clues }: { clues: Array<CollectionQueryItem<TextClue>> }) => {
    return (
        <>
        {clues.map((clue, i) => (
            <VisibleClue key={clue.id} isRevealed={clue.data.isRevealed} text={clue.data.text} index={i} />
        ))}
        {arrayUpTo(4 - clues.length).map((n) => (
            <HiddenClue key={n} />
        ))}
        </>
    );
};

const SequenceClues = ({ clues }: { clues: Array<CollectionQueryItem<TextClue>> }) => {
    return (
        <>
        {clues.map((clue, i) => (
            <VisibleClue key={clue.id} isRevealed={clue.data.isRevealed} text={clue.data.text} index={i} />
        ))}
        {clues.length === 3 && <LastInSequenceClue allOtherCluesRevealed={!clues.some((c) => !c.data.isRevealed)} />}
        {clues.length < 3 && arrayUpTo(4 - clues.length).map((n) => (
            <HiddenClue key={n} />
        ))}
        </>
    );
};

const MissingVowelsClues = ({ clue }: { clue: CollectionQueryItem<CompoundTextClue>; }) => {
    return (
        <>
            {clue.data.texts.map((text, i) => 
                <VisibleClue key={i} isRevealed={clue.data.isRevealed} text={text} index={i} />
            )}
        </>
    );
};

const VisibleClue = ({ isRevealed, text, index }: { isRevealed: boolean; text: string; index: number; }) => {
    return (
        <div
            className={isRevealed ? styles.revealedClue : styles.unrevealedClue}
            data-cy={isRevealed ? `revealed-clue-${index}` : `unrevealed-clue-${index}`}
        >
            {isRevealed ? text : `(${text})`}
        </div>
    );
};

const LastInSequenceClue = ({ allOtherCluesRevealed }: { allOtherCluesRevealed: boolean; }) => {
    return (
        <div className={allOtherCluesRevealed ? styles.revealedClue : styles.unrevealedClue} data-cy={'last-clue'}>?</div>
    );
};

const HiddenClue = () => {
    return (
        <div className={styles.hiddenClue}></div>
    );
};

function arrayUpTo(n: number) {
    return Array.from(Array(n).keys());
}