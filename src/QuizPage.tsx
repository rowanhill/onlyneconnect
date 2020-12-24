import React from 'react';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { Link } from 'react-router-dom';
import firebase from './firebase';
import { Quiz } from './models';

interface QuizPageProps {
    quizId: string;
}

export const QuizPage = ({ quizId }: QuizPageProps) => {
    const [quizData, loading, error] = useDocumentData<Quiz>(firebase.firestore().collection('quizzes').doc(quizId));
    if (error) {
        console.error(error);
        return <p>There was an error loading the quiz! Please try again.</p>;
    }
    if (loading) {
        return <p>Loading your quiz...</p>;
    }
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