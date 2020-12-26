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
    return { data, loading: loading || query === null, error };
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
    if (questionsResult.error) {
        console.error(questionsResult.error);
    }
    const currentQuestionItem = questionsResult.data
        ?.find((questionData) => questionData.data.questionIndex === quizData?.currentQuestionIndex);

    // Fetch clues
    let cluesQuery: firebase.firestore.Query|null = null;
    if (questionsResult.data) {
        if (currentQuestionItem) {
            // Get all question's clues
            if (isQuizOwner) {
                cluesQuery = db.collection('quizzes').doc(quizId).collection('questions').doc(currentQuestionItem.id).collection('clues')
                    .orderBy('clueIndex', 'asc');
            } else {
                cluesQuery = db.collection('quizzes').doc(quizId).collection('questions').doc(currentQuestionItem.id).collection('clues')
                    .where('clueIndex', '<=', currentQuestionItem.data.currentClueIndex)
                    .orderBy('clueIndex', 'asc');
            }
        }
    }
    const cluesResult = useCollectionResult<Clue>(cluesQuery);
    if (cluesResult.error) {
        console.error(cluesResult.error);
    }

    // Fetch teams
    let teamsQuery: firebase.firestore.Query = db.collection('teams')
        .where('quizId', '==', quizId)
        .orderBy('points', 'desc');
    let teamsResult = useCollectionResult<Team>(teamsQuery);
    if (teamsResult.error) {
        console.error(teamsResult.error);
    }

    const teamId = window.localStorage.getItem('teamId');
    const isCaptain = !isQuizOwner && window.localStorage.getItem('isCaptain') === 'true';

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
    if (answersResult.error) {
        console.error(answersResult.error);
    }

    // Render
    function inner() {
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
            <>
                <div className={styles.leftPanel}>
                    <div>
                        <h1>{quizData.name}</h1>
                        {joinUrl && <p>Invite others to your team with this link: {joinUrl.href}</p>}
                    </div>
                    {isQuizOwner ?
                        <>
                            <CurrentQuestion
                                currentQuestionItem={currentQuestionItem}
                                questionsError={questionsResult.error}
                                quizId={quizId}
                                cluesResult={cluesResult}
                            />
                            <QuizControls
                                questionsData={questionsResult.data}
                                currentQuestionItem={currentQuestionItem}
                                cluesResult={cluesResult}
                                quizId={quizId}
                            />
                        </> :
                        <>
                            <CurrentQuestion
                                currentQuestionItem={currentQuestionItem}
                                questionsError={questionsResult.error}
                                quizId={quizId}
                                cluesResult={cluesResult}
                            />
                        </> 
                    }
                </div>
                <div className={styles.rightPanel}>
                    <Scoreboard quizId={quizId} teamsResult={teamsResult} />
                    <AnswersHistory quizId={quizId} teamId={teamId} answersResult={answersResult} />
                    {isCaptain && <AnswerSubmitBox quizId={quizId} teamId={teamId!} questionAndId={currentQuestionItem} />}
                </div>
            </>
        );
    }
    return <div className={styles.quizPage}>{inner()}</div>;
};

const QuizControls = ({ questionsData, currentQuestionItem, quizId, cluesResult }: { questionsData?: CollectionQueryData<Question>; currentQuestionItem?: CollectionQueryItem<Question>; quizId: string; cluesResult: CollectionQueryResult<Clue>; }) => {
    if (!questionsData) {
        return null;
    }
    if (currentQuestionItem) {
        return <RevelationControls quizId={quizId} questionsData={questionsData} currentQuestionItem={currentQuestionItem} cluesResult={cluesResult} />;
    } else {
        return <StartQuizButton quizId={quizId} questionsData={questionsData} />;
    }
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
        return <div><strong>There was an error loading the clues! Please try again</strong></div>;
    }
    if (loading || !clues) {
        return <div>Loading clues</div>;
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

const CurrentQuestion = ({ currentQuestionItem, questionsError, quizId, cluesResult }: { currentQuestionItem?: CollectionQueryItem<Question>; questionsError?: Error; quizId: string; cluesResult: CollectionQueryResult<Clue>; }) => {
    function inner() {
        if (currentQuestionItem === undefined) {
            return <>Waiting for quiz to start...</>;
        }
        if (questionsError) {
            return <strong>There was an error loading the question! Please try again.</strong>;
        }
        return <QuestionClues quizId={quizId} currentQuestionItem={currentQuestionItem} cluesResult={cluesResult} />;
    }
    return <div className={styles.questionPanel}>{inner()}</div>;
};

const QuestionClues = ({ quizId, currentQuestionItem, cluesResult }: { quizId: string; currentQuestionItem: CollectionQueryItem<Question>; cluesResult: CollectionQueryResult<Clue>; }) => {
    const { data: clues, loading, error } = cluesResult;
    if (error) {
        return <strong>There was an error loading the clues! Please try again</strong>;
    }
    if (loading) {
        return <>Loading clues</>;
    }
    if (!clues || clues.length === 0) {
        return <>Waiting for first clue...</>;
    }
    return (
        <>
        {clues.map((clue) => (
            <div key={clue.data.clueIndex}>
                {clue.data.clueIndex <= currentQuestionItem.data.currentClueIndex ? clue.data.text : `(${clue.data.text})`}
            </div>
        ))}
        </>
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

const AnswersHistory = ({ quizId, teamId, answersResult }: { quizId: string; teamId: string|null; answersResult: CollectionQueryResult<Answer> }) => {
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
                <div key={answer.id}>
                    {answer.data.text} ({answer.data.points !== undefined ? answer.data.points : 'unscored'})
                </div>
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