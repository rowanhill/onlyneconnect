import { Card } from './Card';
import { useCluesContext, useQuestionsContext } from './contexts/quizPage';
import { CollectionQueryItem } from './hooks/useCollectionResult';
import { Clue, Question, throwBadQuestionType } from './models';
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
    const orderedClues = currentQuestionItem.data.clueIds
        .map((id) => questionCluesById[id])
        .filter((clue) => !!clue);

    switch (currentQuestionItem.data.type) {
        case 'connection':
            return (<ConnectionClues clues={orderedClues} />);
        case 'sequence':
            return (<SequenceClues clues={orderedClues} />);
        default:
            throwBadQuestionType(currentQuestionItem.data);
    }
};

const ConnectionClues = ({ clues }: { clues: Array<CollectionQueryItem<Clue>> }) => {
    return (
        <>
        {clues.map((clue, i) => (
            <VisibleClue key={clue.id} clue={clue} index={i} />
        ))}
        {arrayUpTo(4 - clues.length).map((n) => (
            <HiddenClue key={n} />
        ))}
        </>
    );
};

const SequenceClues = ({ clues }: { clues: Array<CollectionQueryItem<Clue>> }) => {
    return (
        <>
        {clues.map((clue, i) => (
            <VisibleClue key={clue.id} clue={clue} index={i} />
        ))}
        {clues.length === 3 && <LastInSequenceClue allOtherCluesRevealed={!clues.some((c) => !c.data.isRevealed)} />}
        {clues.length < 3 && arrayUpTo(4 - clues.length).map((n) => (
            <HiddenClue key={n} />
        ))}
        </>
    );
};

const VisibleClue = ({ clue, index }: { clue: CollectionQueryItem<Clue>; index: number; }) => {
    return (
        <div
            className={clue.data.isRevealed ? styles.revealedClue : styles.unrevealedClue}
            data-cy={clue.data.isRevealed ? `revealed-clue-${index}` : `unrevealed-clue-${index}`}
        >
            {clue.data.isRevealed ? clue.data.text : `(${clue.data.text})`}
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