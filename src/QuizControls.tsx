import { useQuestionsContext } from './contexts/quizPage';
import { CollectionQueryItem } from './hooks/useCollectionResult';
import { Question } from './models';
import { QuizControlStart } from './QuizControlStart';
import { QuizControlReveal } from './QuizControlReveal';
import { GenericErrorBoundary } from './GenericErrorBoundary';

export const QuizControls = ({ currentQuestionItem }: { currentQuestionItem?: CollectionQueryItem<Question>; }) => {
    const { data: questionsData } = useQuestionsContext();
    if (!questionsData) {
        return null;
    }
    if (currentQuestionItem) {
        return (
            <div data-cy="quiz-controls">
                <GenericErrorBoundary>
                    <QuizControlReveal currentQuestionItem={currentQuestionItem} />
                </GenericErrorBoundary>
            </div>
        );
    } else {
        return (
            <div data-cy="quiz-controls">
                <GenericErrorBoundary>
                    <QuizControlStart />
                </GenericErrorBoundary>
            </div>
        );
    }
};