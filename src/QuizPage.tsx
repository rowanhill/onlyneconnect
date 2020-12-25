import React from 'react';
import { useCollection, useCollectionData, useDocumentData } from 'react-firebase-hooks/firestore';
import { Link } from 'react-router-dom';
import firebase from './firebase';
import { Clue, Question, Quiz } from './models';

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
        <CurrentQuestion quizId={quizId} currentQuestionIndex={quizData.currentQuestionIndex} />
        </>
    );
};

const CurrentQuestion = ({ quizId, currentQuestionIndex }: { quizId: string; currentQuestionIndex: number; }) => {
    const query = firebase.firestore()
        .collection('quizzes').doc(quizId).collection('questions')
        .where('questionIndex', '<=', currentQuestionIndex)
        .orderBy('questionIndex', 'desc')
        .limit(1);

    const [questionsSnapshot, loading, error] = useCollection(query);
    if (error) {
        console.error(error);
        return <div><strong>There was an error loading the question! Please try again</strong></div>
    }
    if (loading) {
        return <div>Loading question</div>
    }
    if (!questionsSnapshot) {
        console.error(`Questions data is undefined for quiz ${quizId} @ ${currentQuestionIndex}`);
        return <div><strong>There was an error loading the question! please try again</strong></div>
    }
    if (questionsSnapshot.docs.length !== 1) {
        console.error(`Expected exactly one question for quiz  ${quizId} @ ${currentQuestionIndex} but found ${questionsSnapshot.docs.length}`);
        return <div><strong>There was an error loading the question! Please try again</strong></div>
    }
    const questionDoc = questionsSnapshot.docs[0];
    const question = questionDoc.data();
    return (
        <div>
            <QuestionClues quizId={quizId} questionId={questionDoc.id} question={question} />
        </div>
    );
};

const QuestionClues = ({ quizId, questionId, question }: { quizId: string; questionId: string; question: Question; }) => {
    const query = firebase.firestore()
        .collection('quizzes').doc(quizId).collection('questions').doc(questionId).collection('clues')
        .where('clueIndex', '<=', question.currentClueIndex)
        .orderBy('clueIndex', 'asc');
    const [clues, loading, error] = useCollectionData<Clue>(query);
    if (error) {
        console.error(error);
        return <div><strong>There was an error loading the clues! Please try again</strong></div>
    }
    if (loading) {
        return <div>Loading clues</div>
    }
    if (!clues) {
        console.error(`Clues data is undefined for quiz ${quizId} / question ${questionId} @ clue ${question.currentClueIndex}`);
        return <div><strong>There was an error loading the clues! Please try again</strong></div>
    }
    if (clues.length === 0) {
        return <div>Waiting for first clue...</div>;
    }
    return (
        <>
        {clues.map((clue) => (
            <div key={clue.clueIndex}>{clue.text}</div>
        ))}
        </>
    );
};