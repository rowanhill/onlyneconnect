import React, { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { useCollection, useDocumentData } from 'react-firebase-hooks/firestore';
import { Link } from 'react-router-dom';
import firebase from './firebase';
import { useAuth } from './hooks/useAuth';
import { Answer, Clue, Question, Quiz, Team } from './models';
import styles from './QuizPage.module.css';

interface CollectionQueryItem<T> {
    id: string;
    data: T;
}
type CollectionQueryData<T> = CollectionQueryItem<T>[];
interface CollectionQueryResult<T> {
    loading: boolean;
    error: Error | undefined;
    data: CollectionQueryData<T> | undefined;
}
function useCollectionResult<T>(query: firebase.firestore.Query|null): CollectionQueryResult<T> {
    const [snapshot, loading, error] = useCollection(query) as [firebase.firestore.QuerySnapshot<T>|null, boolean, Error|undefined];
    const data = snapshot ?
        snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() })) :
        undefined;
    return { data, loading, error };
}

interface QuizPageProps {
    quizId: string;
}

export const QuizPage = ({ quizId }: QuizPageProps) => {
    const db = firebase.firestore();
    const { user } = useAuth();
    
    // Fetch quiz
    const [quizData, quizLoading, quizError] = useDocumentData<Quiz>(db.collection('quizzes').doc(quizId));
    let isQuizOwner = false;
    if (quizData) {
        isQuizOwner = user?.uid === quizData.ownerId;
    }
    
    // Fetch questions
    let questionsQuery: firebase.firestore.Query|null = null;
    if (quizData) {
        if (isQuizOwner) {
            // Get all questions
            questionsQuery = db.collection('quizzes').doc(quizId).collection('questions')
                .orderBy('questionIndex', 'asc');
        } else {
            // Get only revealed questions
            questionsQuery = db.collection('quizzes').doc(quizId).collection('questions')
                .where('questionIndex', '<=', quizData.currentQuestionIndex)
                .orderBy('questionIndex', 'desc')
                .limit(1);
        }
    }
    const questionsResult = useCollectionResult<Question>(questionsQuery);

    // Fetch clues
    let cluesQuery: firebase.firestore.Query|null = null;
    if (questionsResult.data) {
        const currentQuestionData = questionsResult.data
            .find((questionData) => questionData.data.questionIndex === quizData?.currentQuestionIndex);
        if (currentQuestionData) {
            // Get all question's clues
            if (isQuizOwner) {
                cluesQuery = db.collection('quizzes').doc(quizId).collection('questions').doc(currentQuestionData.id).collection('clues')
                    .orderBy('clueIndex', 'asc');
            } else {
                cluesQuery = db.collection('quizzes').doc(quizId).collection('questions').doc(currentQuestionData.id).collection('clues')
                    .where('clueIndex', '<=', currentQuestionData.data.currentClueIndex)
                    .orderBy('clueIndex', 'asc');
            }
        }
    }
    const cluesResult = useCollectionResult<Clue>(cluesQuery);

    // Fetch teams
    let teamsQuery: firebase.firestore.Query = db.collection('teams')
        .where('quizId', '==', quizId)
        .orderBy('points', 'desc');
    let teamsResult = useCollectionResult<Team>(teamsQuery);

    const teamId = window.localStorage.getItem('teamId');

    // Fetch answers
    let answerQuery: firebase.firestore.Query|null = null;
    if (isQuizOwner) {
        answerQuery = firebase.firestore()
            .collection('quizzes').doc(quizId).collection('answers')
            .orderBy('timestamp', 'asc');
    } else if (teamId) {
        answerQuery = firebase.firestore()
            .collection('quizzes').doc(quizId).collection('answers')
            .where('teamId', '==', teamId)
            .orderBy('timestamp', 'asc');
    }
    const answersResult = useCollectionResult<Answer>(answerQuery);

    // Render
    if (quizError) {
        console.error(quizError);
        return <p>There was an error loading the quiz! Please try again.</p>;
    }
    if (quizLoading) {
        return <p>Loading your quiz...</p>;
    }
    if (!quizData) {
        console.error('Quiz data is undefined for id ' + quizId);
        return <p>There was an error loading the quiz! Please try again.</p>;
    }
    if (!teamId && !isQuizOwner) {
        return <p>You're not part of a team. Do you need to <Link to={`/quiz/${quizId}/create-team`}>create a new team</Link>?</p>
    }
    const joinUrl = (teamId && !isQuizOwner) ? new URL(`/team/${teamId}/join-team`, window.location.href) : undefined;
    return (
        <div className={styles.quizPage}>
            <div>
                <h1>{quizData.name}</h1>
                {joinUrl && <p>Invite others to your team with this link: {joinUrl.href}</p>}
            </div>
            {!isQuizOwner ?
                <QuestionAndAnswers
                    quizId={quizId}
                    currentQuestionIndex={quizData.currentQuestionIndex}
                    questionsResult={questionsResult}
                    cluesResult={cluesResult}
                    teamsResult={teamsResult}
                    answersResult={answersResult}
                    teamId={teamId!}
                /> :
                <QuizOwnerQuestionAndAnswers
                    quizId={quizId}
                    currentQuestionIndex={quizData.currentQuestionIndex}
                    questionsResult={questionsResult}
                    cluesResult={cluesResult}
                />
            }
        </div>
    );
};

const QuizOwnerQuestionAndAnswers = ({ quizId, currentQuestionIndex, questionsResult, cluesResult }: { quizId: string; currentQuestionIndex: number; questionsResult: CollectionQueryResult<Question>; cluesResult: CollectionQueryResult<Clue>; }) => {
    let questionAndId = undefined;
    if (questionsResult.error) {
        console.error(questionsResult.error);
        questionAndId = null;
    }
    if (!questionsResult.loading) {
        if (!questionsResult.data) {
            console.error(`Questions data is undefined for quiz ${quizId} @ ${currentQuestionIndex}`);
            questionAndId = null;
        } else {
            questionAndId = questionsResult.data.find((questionItem) => questionItem.data.questionIndex === currentQuestionIndex);
        }
    }
    return (
        <div className={styles.questionAndAnswers}>
            <div className={styles.questionPanel}>
                <QuestionCluesOrError quizId={quizId} questionAndId={questionAndId} cluesResult={cluesResult} />
                {questionsResult.data && (
                    questionAndId ?
                    <RevelationControls quizId={quizId} questionsData={questionsResult.data} currentQuestionItem={questionAndId} cluesResult={cluesResult} /> :
                    <StartQuizButton quizId={quizId} questionsData={questionsResult.data} />
                )}
            </div>
            {/*TODO <RightPanel quizId={quizId} teamId={teamId} questionAndId={questionAndId} /> */}
        </div>
    );
};

const StartQuizButton = ({ quizId, questionsData }: { quizId: string; questionsData: CollectionQueryData<Question>; }) => {
    const [disabled, setDisabled] = useState(false);
    const unmounted = useRef(false);
    useEffect(() => () => { unmounted.current = true; }, []);
    const startQuiz = () => {
        firebase.firestore()
            .collection('quizzes').doc(quizId)
            .update({
                currentQuestionIndex: questionsData[0].data.questionIndex,
            })
            .then(() => !unmounted.current && setDisabled(false))
            .catch((error) => {
                console.error(`Could not start quiz ${quizId}`, error);
                !unmounted.current && setDisabled(false);
            });
        setDisabled(true);
    };
    return <button disabled={disabled} onClick={startQuiz}>Start quiz</button>;
};

const RevelationControls = ({ quizId, questionsData, currentQuestionItem, cluesResult }: { quizId: string; questionsData: CollectionQueryData<Question>; currentQuestionItem: CollectionQueryItem<Question>; cluesResult: CollectionQueryResult<Clue>; }) => {
    const totalQuestions = questionsData.length;
    const currentQuestionNumber = questionsData.findIndex((questionItem) => questionItem.data.questionIndex === currentQuestionItem.data.questionIndex) + 1;
    const { data: clues, loading, error } = cluesResult;
    const [disabled, setDisabled] = useState(false);
    if (error) {
        console.error(error);
        return <div className={styles.questionPanel}><strong>There was an error loading the clues! Please try again</strong></div>;
    }
    if (loading) {
        return <div className={styles.questionPanel}>Loading clues</div>;
    }
    if (!clues) {
        console.error(`Clues data is undefined for quiz ${quizId} / question ${currentQuestionItem.id}`);
        return <div className={styles.questionPanel}><strong>There was an error loading the clues! Please try again</strong></div>;
    }
    const totalClues = clues.length;
    const currentClueNumber = clues.findIndex((clue) => clue.data.clueIndex === currentQuestionItem.data.currentClueIndex) + 1;
    const nextClue = clues.find((clue) => clue.data.clueIndex > currentQuestionItem.data.currentClueIndex);
    const nextQuestion = questionsData.find((questionItem) => questionItem.data.questionIndex > currentQuestionItem.data.questionIndex);

    const goToNextClue = () => {
        if (!nextClue) {
            console.error('Tried to go to next clue, but next clue is not defined');
            return;
        }
        firebase.firestore()
            .collection('quizzes').doc(quizId).collection('questions').doc(currentQuestionItem.id)
            .update({
                currentClueIndex: nextClue.data.clueIndex
            })
            .then(() => {
                setDisabled(false);
            })
            .catch((error) => {
                console.error(`Could not update quiz ${quizId} question ${currentQuestionItem.id} to clue index ${nextClue.data.clueIndex}`, error);
                setDisabled(false);
            });
        setDisabled(true);
    };
    const goToNextQuestion = () => {
        if (!nextQuestion) {
            console.error('Tried to go to next question, but next question is not defined');
            return;
        }
        firebase.firestore()
            .collection('quizzes').doc(quizId)
            .update({
                currentQuestionIndex: nextQuestion.data.questionIndex
            })
            .then(() => {
                setDisabled(false);
            })
            .catch((error) => {
                console.error(`Could not update quiz ${quizId} to question index ${nextQuestion.data.questionIndex}`, error);
                setDisabled(false);
            });
        setDisabled(true);
    }

    return (
        <div>
            <p>This is question {currentQuestionNumber} of {totalQuestions}. For this question, it is clue {currentClueNumber} of {totalClues}.</p>
            {nextClue && <button disabled={disabled} onClick={goToNextClue}>Next clue</button>}
            {!nextClue && nextQuestion && <button disabled={disabled} onClick={goToNextQuestion}>Next question</button>}
            {!nextClue && !nextQuestion && <p>You've reached the end of the quiz.</p>}
        </div>
    );
};

const QuestionAndAnswers = ({ quizId, currentQuestionIndex, teamId, questionsResult, cluesResult, teamsResult, answersResult }: { quizId: string; currentQuestionIndex: number; teamId: string; questionsResult: CollectionQueryResult<Question>; cluesResult: CollectionQueryResult<Clue>; teamsResult: CollectionQueryResult<Team>; answersResult: CollectionQueryResult<Answer>; }) => {
    let questionAndId = undefined;
    if (questionsResult.error) {
        console.error(questionsResult.error);
        questionAndId = null;
    }
    if (!questionsResult.loading) {
        if (!questionsResult.data) {
            console.error(`Questions data is undefined for quiz ${quizId} @ ${currentQuestionIndex}`);
            questionAndId = null;
        } else if (questionsResult.data.length === 1) {
            questionAndId = questionsResult.data[0];
        }
    }
    return (
        <div className={styles.questionAndAnswers}>
            <QuestionCluesOrError quizId={quizId} questionAndId={questionAndId} cluesResult={cluesResult} />
            <RightPanel quizId={quizId} teamId={teamId} questionAndId={questionAndId} teamsResult={teamsResult} answersResult={answersResult} />
        </div>
    );
};

const QuestionCluesOrError = ({ quizId, questionAndId, cluesResult }: { quizId: string; questionAndId: {id: string; data: Question; }|undefined|null; cluesResult: CollectionQueryResult<Clue>; }) => {
    if (questionAndId === undefined) {
        return null;
    }
    if (questionAndId === null) {
        return <div className={styles.questionPanel}><strong>There was an error loading the question! Please try again.</strong></div>;
    }
    return <QuestionClues quizId={quizId} questionAndId={questionAndId} cluesResult={cluesResult} />
};

const QuestionClues = ({ quizId, questionAndId, cluesResult }: { quizId: string; questionAndId: {id: string; data: Question; }; cluesResult: CollectionQueryResult<Clue>; }) => {
    const { data: clues, loading, error } = cluesResult;
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
            <div key={clue.data.clueIndex}>
                {clue.data.clueIndex <= questionAndId.data.currentClueIndex ? clue.data.text : `(${clue.data.text})`}
            </div>
        ))}
        </div>
    );
};

const Scoreboard = ({ quizId, teamsResult }: { quizId: string; teamsResult: CollectionQueryResult<Team>; }) => {
    const { data: teamsData, loading, error } = teamsResult;
    if (error) {
        console.error(error);
        return <div><strong>There was an error loading the scoreboard! Please try again</strong></div>;
    }
    if (loading) {
        return <div></div>;
    }
    if (!teamsData) {
        console.error(`Teams data is undefined for quiz ${quizId}`);
        return <div><strong>There was an error loading the scoreboard! Please try again</strong></div>;
    }
    return (
        <div>
            <h2>Scoreboard:</h2>
            <ul>
                {teamsData.map((team) => (
                    <li key={team.id}>{team.data.name}: {team.data.points}</li>
                ))}
            </ul>
        </div>
    );
};

const AnswersHistory = ({ quizId, teamId, answersResult }: { quizId: string; teamId: string; answersResult: CollectionQueryResult<Answer> }) => {
    const {data: answersData, loading, error} = answersResult;
    if (error) {
        console.error(error);
        return <div className={styles.answersHistory}><strong>There was an error loading your answers! Please try again</strong></div>;
    }
    if (loading) {
        return <div className={styles.answersHistory}></div>;
    }
    if (!answersData) {
        console.error(`Answers data is undefined for quiz ${quizId} for team ${teamId}`);
        return <div className={styles.answersHistory}><strong>There was an error loading the answers! Please try again</strong></div>;
    }
    return (
        <div className={styles.answersHistory}>
            {answersData.map((answer) => (
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

const RightPanel = ({ quizId, teamId, questionAndId, teamsResult, answersResult }: { quizId: string; teamId: string; questionAndId: {id: string; data: Question; }|undefined|null; teamsResult: CollectionQueryResult<Team>; answersResult: CollectionQueryResult<Answer>; }) => {
    const isCaptain = window.localStorage.getItem('isCaptain') === 'true';
    return (
        <div className={styles.rightPanel}>
            <Scoreboard quizId={quizId} teamsResult={teamsResult} />
            <AnswersHistory quizId={quizId} teamId={teamId} answersResult={answersResult} />
            {isCaptain && <AnswerSubmitBox quizId={quizId} teamId={teamId} questionAndId={questionAndId} />}
        </div>
    );
};