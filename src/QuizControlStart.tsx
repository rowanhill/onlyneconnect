import { useEffect, useRef, useState } from 'react';
import firebase from './firebase';
import { useQuizContext } from './contexts/quizPage';
import { PrimaryButton } from './Button';

export const QuizControlStart = () => {
    const { quizId, quiz } = useQuizContext();
    const [disabled, setDisabled] = useState(false);
    const unmounted = useRef(false);
    useEffect(() => () => { unmounted.current = true; }, []);
    const startQuiz = () => {
        const db = firebase.firestore();
        const batch = db.batch();
        const quizDoc = db.doc(`quizzes/${quizId}`);
        batch.update(quizDoc, {
            currentQuestionId: quiz.questionIds[0],
        });
        const questionDoc = db.doc(`quizzes/${quizId}/questions/${quiz.questionIds[0]}`);
        batch.update(questionDoc, {
            isRevealed: true,
        });
        batch.commit()
            .then(() => !unmounted.current && setDisabled(false))
            .catch((error) => {
                console.error(`Could not start quiz ${quizId}`, error);
                !unmounted.current && setDisabled(false);
            });
        setDisabled(true);
    };
    return <PrimaryButton disabled={disabled} onClick={startQuiz}>Start quiz</PrimaryButton>;
};