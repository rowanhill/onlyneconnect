import { useState } from 'react';
import { PrimaryButton } from './Button';
import { useCluesContext, useQuestionsContext, useQuizContext } from './contexts/quizPage';
import { CollectionQueryItem } from './hooks/useCollectionResult';
import { getClueIds, Question, throwBadQuestionType } from './models';
import { revealWallSolution, revealNextClue, revealNextQuestion, revealAnswer, closeQuiz } from './models/quiz';

type RevealButtonType = 'error'|
    'solve-wall'|
    'reveal-connection'|'reveal-connection-and-last-in-sequence'|'reveal-connections'|
    'next-clue'|
    'next-question'|
    'end-quiz'|
    'quiz-ended';

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
    const orderedClues = getClueIds(currentQuestionItem.data).map((id) => cluesForQuestionById[id]);
    
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

    // Determine what solutions/connections, if any, are revealed
    const isWallWithGroupsUnresolved = !!currentClue && currentClue.data.type === 'four-by-four-text' && !currentClue.data.solution;
    const connectionsUnrevealed = currentQuestionItem && (
        (currentQuestionItem.data.type === 'wall' && !currentQuestionItem.data.connections) ||
        (currentQuestionItem.data.type !== 'wall' && !currentQuestionItem.data.connection));

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

        revealNextQuestion(quizId, nextQuestion.id)
            .then(() => {
                setDisabled(false);
            })
            .catch((error) => {
                console.error(`Could not update quiz ${quizId} to question ${nextQuestion.id}`, error);
                setDisabled(false);
            });
        setDisabled(true);
    };
    const handleRevealConnection = () => {
        if (!currentQuestionItem) {
            console.error('Tried to reveal connection(s) with no current question set');
            return;
        }
        revealAnswer(quizId, currentQuestionItem.id, currentClue?.id)
            .then(() => {
                setDisabled(false);
            })
            .catch((error) => {
                console.error(`Could not reveal connection(s) of ${quizId}/${currentQuestionItem.id} and close ${currentClue?.id}`, error);
                setDisabled(false);
            });
        setDisabled(true);
    };
    const handleResolveWallGroups = () => {
        if (!currentClue) {
            console.error('Tried to resolve the wall without a current clue');
            return;
        }
        if (currentClue.data.type !== 'four-by-four-text') {
            console.error(`Tried to resolve the wall without a four-by-four-text clue (current clue is type ${currentClue.data.type})`);
            return;
        }
        if (typeof currentClue.data.solution !== 'undefined') {
            console.error('Tried to resolve the wall, but a solution is already shown');
            return;
        }
        revealWallSolution(quizId, currentQuestionItem.id, currentClue.id)
            .then(() => {
                setDisabled(false);
            })
            .catch((error) => {
                console.error(`Could not copy solution to clue ${quizId}/${currentClue.id}`, error);
                setDisabled(false);
            });
        setDisabled(true);
    };
    const handleCloseQuiz = () => {
        closeQuiz(quizId)
            .then(() => {
                setDisabled(false);
            })
            .catch((error) => {
                console.error(`Could not close quiz ${quizId}`, error);
                setDisabled(false);
            });
        setDisabled(true);
    }

    let buttonToShow: RevealButtonType = 'error';
    if (nextClue) {
        buttonToShow = 'next-clue';
    } else if (isWallWithGroupsUnresolved) {
        buttonToShow = 'solve-wall';
    } else if (connectionsUnrevealed) {
        switch (currentQuestionItem.data.type) {
            case 'connection':
            case 'missing-vowels':
                buttonToShow = 'reveal-connection';
                break;
            case 'sequence':
                buttonToShow = 'reveal-connection-and-last-in-sequence';
                break;
            case 'wall':
                buttonToShow = 'reveal-connections';
                break;
            default:
                throwBadQuestionType(currentQuestionItem.data);
        }
    } else if (nextQuestion) {
        buttonToShow = 'next-question';
    } else if (!quiz.isComplete) {
        buttonToShow = 'end-quiz';
    } else if (currentClue && currentClue.data.closedAt) {
        buttonToShow = 'quiz-ended';
    }
    return (
        <>
            <p>
                This is question {currentQuestionNumber} of {totalQuestions}.{' '}
                {currentQuestionItem.data.type === 'wall' && <>The whole grid is revealed at once.</>}
                {currentQuestionItem.data.type === 'missing-vowels' && <>All the clues are revealed at once.</>}
                {totalClues > 1 && currentClueNumber === 0 &&
                    <>It has {totalClues} clues, revealed individually.</>
                }
                {totalClues > 1 && currentClueNumber > 0 &&
                    <>This is clue {currentClueNumber} of {totalClues}</>
                }
            </p>
            {buttonToShow === 'solve-wall' && <PrimaryButton disabled={disabled} onClick={handleResolveWallGroups}>Resolve wall groups</PrimaryButton>}
            {buttonToShow === 'reveal-connection' && <PrimaryButton disabled={disabled} onClick={handleRevealConnection}>Close question &amp; show connection</PrimaryButton>}
            {buttonToShow === 'reveal-connection-and-last-in-sequence' && <PrimaryButton disabled={disabled} onClick={handleRevealConnection}>Close question &amp; show connection &amp; last in sequence</PrimaryButton>}
            {buttonToShow === 'reveal-connections' && <PrimaryButton disabled={disabled} onClick={handleRevealConnection}>Close question &amp; show group connections</PrimaryButton>}
            {buttonToShow === 'next-clue' && <PrimaryButton disabled={disabled} onClick={handleGoToNextClue}>Next clue</PrimaryButton>}
            {buttonToShow === 'next-question' && <PrimaryButton disabled={disabled} onClick={handleGoToNextQuestion}>Next question</PrimaryButton>}
            {buttonToShow === 'end-quiz' && <PrimaryButton disabled={disabled} onClick={handleCloseQuiz}>End quiz</PrimaryButton>}
            {buttonToShow === 'quiz-ended' && <p>You've reached the end of the quiz</p>}
            {buttonToShow === 'error' && <p>Error: There is no next clue or question, nor current clue to close</p>}
        </>
    );
};