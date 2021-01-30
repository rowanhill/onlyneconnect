import { useState } from 'react';
import { PrimaryButton } from './Button';
import { useCluesContext, useQuestionsContext, useQuizContext } from './contexts/quizPage';
import { CollectionQueryItem } from './hooks/useCollectionResult';
import { Question } from './models';
import { closeLastClue, revealNextClue, revealNextQuestion } from './models/quiz';

export const QuizControlReveal = ({ currentQuestionItem }: { currentQuestionItem: CollectionQueryItem<Question>; }) => {
    const { quizId, quiz } = useQuizContext();
    const { data: questionsData } = useQuestionsContext();
    const { data: clues, loading, error } = useCluesContext();
    const [disabled, setDisabled] = useState(false);
    if (error) {
        return <div><strong>There was an error loading the clues! Please try again</strong></div>;
    }
    if (loading || !clues || !questionsData) {
        return <div>Loading clues</div>;
    }
    
    // Construct an ordered array of clue items for the current question
    const cluesForQuestion = clues.filter((clue) => clue.data.questionId === quiz.currentQuestionId);
    const cluesForQuestionById = Object.fromEntries(cluesForQuestion.map((clue) => [clue.id, clue]));
    const orderedClues = currentQuestionItem.data.type === 'missing-vowels' || currentQuestionItem.data.type === 'wall' ?
        [cluesForQuestionById[currentQuestionItem.data.clueId]] :
        currentQuestionItem.data.clueIds.map((id) => cluesForQuestionById[id]);
    
    // Find the current / total clue numbers for display, and the next clue, if any
    const totalClues = orderedClues.length;
    const nextClueIndex = orderedClues.findIndex((clue) => !clue.data.isRevealed);
    const currentClueNumber = nextClueIndex === -1 ? totalClues : nextClueIndex;
    const nextClue = nextClueIndex === -1 ? undefined : orderedClues[nextClueIndex];
    const currentClue = nextClueIndex === -1 ?
        orderedClues[orderedClues.length - 1] :
        (nextClueIndex === 0 ? undefined : orderedClues[nextClueIndex - 1]);

    // Construct an ordered array of question items
    const questionsById = Object.fromEntries(questionsData.map((questionItem) => [questionItem.id, questionItem]));
    const orderedQuestions = quiz.questionIds.map((id) => questionsById[id]);

    // Find the current / total quesiton numbers for display, and the next question, if any
    const totalQuestions = quiz.questionIds.length;
    const currentQuestionNumber = quiz.questionIds.findIndex((questionId) => questionId === quiz.currentQuestionId) + 1;
    const nextQuestionIndex = currentQuestionNumber;
    const nextQuestion = nextQuestionIndex >= orderedQuestions.length ? undefined : orderedQuestions[nextQuestionIndex];

    const handleGoToNextClue = () => {
        if (!nextClue) {
            console.error('Tried to go to next clue, but next clue is not defined');
            return;
        }

        revealNextClue(quizId, nextClue.id, currentClue?.id)
            .then(() => {
                setDisabled(false);
            })
            .catch((error) => {
                console.error(`Could not update quiz ${quizId} to reveal clue ${nextClue.id}`, error);
                setDisabled(false);
            });
        setDisabled(true);
    };
    const handleGoToNextQuestion = () => {
        if (!nextQuestion) {
            console.error('Tried to go to next question, but next question is not defined');
            return;
        }

        revealNextQuestion(quizId, nextQuestion.id, currentClue?.id)
            .then(() => {
                setDisabled(false);
            })
            .catch((error) => {
                console.error(`Could not update quiz ${quizId} to question ${nextQuestion.id}`, error);
                setDisabled(false);
            });
        setDisabled(true);
    }
    const handleCloseLastClue = () => {
        if (!currentClue) {
            console.error('Tried to close the last clue with no currentClue set');
            return;
        }
        closeLastClue(quizId, currentClue.id)
            .then(() => {
                setDisabled(false);
            })
            .catch((error) => {
                console.error(`Could not update clue ${quizId}/${currentClue.id} to close it`, error);
                setDisabled(false);
            });
        setDisabled(true);
    }

    let buttonToShow: 'error'|'next-clue'|'next-question'|'end-quiz'|'quiz-ended' = 'error';
    if (nextClue) {
        buttonToShow = 'next-clue';
    } else if (nextQuestion) {
        buttonToShow = 'next-question';
    } else if (currentClue) {
        if (!currentClue.data.closedAt) {
            buttonToShow = 'end-quiz';
        } else {
            buttonToShow = 'quiz-ended';
        }
    }
    return (
        <>
            <p>This is question {currentQuestionNumber} of {totalQuestions}. For this question, it is clue {currentClueNumber} of {totalClues}.</p>
            {buttonToShow === 'next-clue' && <PrimaryButton disabled={disabled} onClick={handleGoToNextClue}>Next clue</PrimaryButton>}
            {buttonToShow === 'next-question' && <PrimaryButton disabled={disabled} onClick={handleGoToNextQuestion}>Next question</PrimaryButton>}
            {buttonToShow === 'end-quiz' && <PrimaryButton disabled={disabled} onClick={handleCloseLastClue}>End quiz</PrimaryButton>}
            {buttonToShow === 'quiz-ended' && <p>You've reached the end of the quiz</p>}
            {buttonToShow === 'error' && <p>Error: There is no next clue or question, nor current clue to close</p>}
        </>
    );
};