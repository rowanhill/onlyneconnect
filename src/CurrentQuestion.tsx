import { Card } from './Card';
import { useCluesContext, useQuestionsContext } from './contexts/quizPage';
import { CollectionQueryItem } from './hooks/useCollectionResult';
import { Question } from './models';
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
        return <>Waiting for first clue...</>;
    }
    const questionCluesById = Object.fromEntries(questionClues.map((clue) => [clue.id, clue]));
    const orderedClues = currentQuestionItem.data.clueIds
        .map((id) => questionCluesById[id])
        .filter((clue) => !!clue);
    return (
        <>
        {orderedClues.map((clue, i) => (
            <div
                key={clue.id}
                className={styles.clue + (clue.data.isRevealed ? ` ${styles.revealedClue}` : ` ${styles.unrevealedClue}`)}
                data-cy={clue.data.isRevealed ? `revealed-clue-${i}` : `unrevealed-clue-${i}`}
            >
                {clue.data.isRevealed ? clue.data.text : `(${clue.data.text})`}
            </div>
        ))}
        {Array.from(Array(4 - orderedClues.length).keys()).map((n) => (
            <div key={n} className={styles.clue + ' ' + styles.hiddenClue}></div>
        ))}
        </>
    );
};