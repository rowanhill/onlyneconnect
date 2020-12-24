import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import firebase from './firebase';

type UseQuizResult = {
    error: firebase.firestore.FirestoreError,
    loading: false,
    quiz: null,
} | {
    loading: true,
    error: null,
    quiz: null,
} | {
    loading: false,
    error: null,
    quiz: firebase.firestore.DocumentSnapshot<firebase.firestore.DocumentData>,
};
function useQuiz(id: string): UseQuizResult {
    // initialize our default state
    const [error, setError] = useState<firebase.firestore.FirestoreError|null>(null);
    const [loading, setLoading] = useState(true);
    const [quiz, setQuiz] = useState<firebase.firestore.DocumentSnapshot<firebase.firestore.DocumentData>|null>(null);

    // when the id attribute changes (including mount)
    // subscribe to the recipe document and update
    // our state when it changes.
    useEffect(() => {
        const unsubscribe = firebase.firestore()
            .collection('quizzes')
            .doc(id)
            .onSnapshot((doc) => {
                console.log(doc);
                setQuiz(doc);
                setLoading(false);
            },
            (err) => {
                setLoading(false);
                setError(err);
            });
        // returning the unsubscribe function will ensure that
        // we unsubscribe from document changes when our id
        // changes to a different value.
        return () => unsubscribe()
    }, [id]);
  
    return {
        error,
        loading,
        quiz,
    } as UseQuizResult;
}

interface QuizPageProps {
    quizId: string;
}

export const QuizPage = ({ quizId }: QuizPageProps) => {
    const quizResult = useQuiz(quizId);
    if (quizResult.error) {
        console.error(quizResult.error);
        return <p>There was an error loading the quiz! Please try again.</p>;
    }
    if (quizResult.loading || !(quizResult as any).quiz) {
        return <p>Loading your quiz...</p>;
    }
    const quizData = quizResult.quiz.data();
    if (!quizData) {
        console.error('Quiz data is undefined for id ' + quizId);
        return <p>There was an error loading the quiz! Please try again.</p>;
    }
    const teamId = window.localStorage.getItem('teamId');
    if (!teamId) {
        return <p>You're not part of a team. Do you need to <Link to={`/quiz/${quizId}/create-team`}>create a new team</Link>?</p>
    }
    const joinUrl = new URL(`/team/${teamId}/join-team`, window.location.href);
    return (
        <>
        <h1>{quizData.name}</h1>
        <p>Invite others to your team with this link: {joinUrl.href}</p>
        </>
    );
};