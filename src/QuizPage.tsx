import React, { ChangeEvent, FormEvent, useState } from 'react';
import { useCollection, useCollectionData, useDocumentData } from 'react-firebase-hooks/firestore';
import { Link } from 'react-router-dom';
import firebase from './firebase';
import { Answer, Clue, Question, Quiz } from './models';
import styles from './QuizPage.module.css';

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
        <div className={styles.quizPage}>
            <div>
                <h1>{quizData.name}</h1>
                <p>Invite others to your team with this link: {joinUrl.href}</p>
            </div>
            <QuestionAndAnswers quizId={quizId} currentQuestionIndex={quizData.currentQuestionIndex} teamId={teamId} />
        </div>
    );
};

const QuestionAndAnswers = ({ quizId, currentQuestionIndex, teamId }: { quizId: string; currentQuestionIndex: number; teamId: string; }) => {
    const query = firebase.firestore()
        .collection('quizzes').doc(quizId).collection('questions')
        .where('questionIndex', '<=', currentQuestionIndex)
        .orderBy('questionIndex', 'desc')
        .limit(1);

    const [questionsSnapshot, loading, error] = useCollection(query);
    let questionAndId = undefined;
    if (error) {
        console.error(error);
        questionAndId = null;
    }
    if (!loading) {
        if (!questionsSnapshot) {
            console.error(`Questions data is undefined for quiz ${quizId} @ ${currentQuestionIndex}`);
            questionAndId = null;
        } else if (questionsSnapshot.docs.length === 1) {
            const questionDoc = questionsSnapshot.docs[0];
            questionAndId = {
                id: questionDoc.id,
                data: questionDoc.data()
            };
        }
    }
    return (
        <div className={styles.questionAndAnswers}>
            <QuestionCluesOrError quizId={quizId} questionAndId={questionAndId} />
            <AnswersPanel quizId={quizId} teamId={teamId} questionAndId={questionAndId} />
        </div>
    );
};

const QuestionCluesOrError = ({ quizId, questionAndId }: { quizId: string; questionAndId: {id: string; data: Question; }|undefined|null; }) => {
    if (questionAndId === undefined) {
        return null;
    }
    if (questionAndId === null) {
        return <div className={styles.questionPanel}><strong>There was an error loading the question! Please try again.</strong></div>;
    }
    return <QuestionClues quizId={quizId} questionAndId={questionAndId} />
};

const QuestionClues = ({ quizId, questionAndId }: { quizId: string; questionAndId: {id: string; data: Question; } }) => {
    const query = firebase.firestore()
        .collection('quizzes').doc(quizId).collection('questions').doc(questionAndId.id).collection('clues')
        .where('clueIndex', '<=', questionAndId.data.currentClueIndex)
        .orderBy('clueIndex', 'asc');
    const [clues, loading, error] = useCollectionData<Clue>(query);
    if (error) {
        console.error(error);
        return <div className={styles.questionPanel}><strong>There was an error loading the clues! Please try again</strong></div>;
    }
    if (loading) {
        return <div className={styles.questionPanel}>Loading clues</div>;
    }
    if (!clues) {
        console.error(`Clues data is undefined for quiz ${quizId} / question ${questionAndId.id} @ clue ${questionAndId.data.currentClueIndex}`);
        return <div className={styles.questionPanel}><strong>There was an error loading the clues! Please try again</strong></div>;
    }
    if (clues.length === 0) {
        return <div className={styles.questionPanel}>Waiting for first clue...</div>;
    }
    return (
        <div className={styles.questionPanel}>
        {clues.map((clue) => (
            <div key={clue.clueIndex}>{clue.text}</div>
        ))}
        </div>
    );
};

const AnswersHistory = ({ quizId, teamId }: { quizId: string; teamId: string; }) => {
    const query = firebase.firestore()
        .collection('quizzes').doc(quizId).collection('answers')
        .where('teamId', '==', teamId)
        .orderBy('timestamp', 'asc');
    const [answersSnapshot, loading, error] = useCollection(query);
    if (error) {
        console.error(error);
        return <div className={styles.answersHistory}><strong>There was an error loading your answers! Please try again</strong></div>;
    }
    if (loading) {
        return <div className={styles.answersHistory}></div>;
    }
    if (!answersSnapshot) {
        console.error(`Answers data is undefined for quiz ${quizId} for team ${teamId}`);
        return <div className={styles.answersHistory}><strong>There was an error loading the answers! Please try again</strong></div>;
    }
    if (answersSnapshot.docs.length === 0) {
        return <div className={styles.answersHistory}></div>;
    }
    const answers = answersSnapshot.docs.map((answerDoc: any) => ({ id: answerDoc.id, data: answerDoc.data()}));
    return (
        <div className={styles.answersHistory}>
            {answers.map((answer: { id: string; data: Answer; }) => (
                <div key={answer.id}>{answer.data.text} ({answer.data.points !== undefined ? answer.data.points : 'unscored'})</div>
            ))}
        </div>
    );
};

const AnswerSubmitBox = ({ quizId, teamId, questionAndId }: { quizId: string; teamId: string; questionAndId: {id: string; data: Question; }|undefined|null; }) => {
    const [answerText, setAnswerText] = useState('');
    const [disabled, setDisabled] = useState(false);
    const onAnswerChange = (e: ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        setAnswerText(e.target.value);
    };
    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setDisabled(true);

        const db = firebase.firestore();
        db.collection('quizzes').doc(quizId).collection('answers').add({
            questionId: questionAndId?.id,
            teamId,
            text: answerText,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        })
        .then(() => {
            setDisabled(false);
            setAnswerText('');
        })
        .catch((error) => {
            console.error("Could not submit answer", error);
        });
    };
    return (
        <form onSubmit={submit}>
            <fieldset disabled={disabled || !questionAndId}>
                <input type="text" placeholder="Type your answer here" value={answerText} onChange={onAnswerChange} />
                <button>Submit</button>
            </fieldset>
        </form>
    );
};

const AnswersPanel = ({ quizId, teamId, questionAndId }: { quizId: string; teamId: string; questionAndId: {id: string; data: Question; }|undefined|null; }) => {
    const isCaptain = window.localStorage.getItem('isCaptain') === 'true';
    return (
        <div className={styles.answersPanel}>
            <AnswersHistory quizId={quizId} teamId={teamId} />
            {isCaptain && <AnswerSubmitBox quizId={quizId} teamId={teamId} questionAndId={questionAndId} />}
        </div>
    );
};