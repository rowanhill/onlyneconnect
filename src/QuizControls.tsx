import { useQuestionsContext } from './contexts/quizPage';
import { CollectionQueryItem } from './hooks/useCollectionResult';
import { Question } from './models';
import { QuizControlStart } from './QuizControlStart';
import { QuizControlReveal } from './QuizControlReveal';
import styles from './QuizControls.module.css';

export const QuizControls = ({ currentQuestionItem }: { currentQuestionItem?: CollectionQueryItem<Question>; }) => {
    const { data: questionsData } = useQuestionsContext();
    if (!questionsData) {
        return null;
    }
    if (currentQuestionItem) {
        return (
            <div className={styles.quizControls} data-cy="quiz-controls">
                <QuizControlReveal currentQuestionItem={currentQuestionItem} />
            </div>
        );
    } else {
        return (
            <div className={styles.quizControls} data-cy="quiz-controls">
                <QuizControlStart />
            </div>
        );
    }
};