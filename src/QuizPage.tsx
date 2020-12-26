import React, { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { useCollection, useCollectionData, useDocumentData } from 'react-firebase-hooks/firestore';
import { Link } from 'react-router-dom';
import firebase from './firebase';
import { useAuth } from './hooks/useAuth';
import { Answer, Clue, Question, Quiz, Team } from './models';
import styles from './QuizPage.module.css';

interface QuizPageProps {
    quizId: string;
}

export const QuizPage = ({ quizId }: QuizPageProps) => {
    const { user } = useAuth();
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
    const isQuizOwner = user?.uid === quizData.ownerId;
    const teamId = window.localStorage.getItem('teamId');
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
                <QuestionAndAnswers quizId={quizId} currentQuestionIndex={quizData.currentQuestionIndex} teamId={teamId!} /> :
                <QuizOwnerQuestionAndAnswers quizId={quizId} currentQuestionIndex={quizData.currentQuestionIndex} />
            }
        </div>
    );
};

const QuizOwnerQuestionAndAnswers = ({ quizId, currentQuestionIndex}: { quizId: string; currentQuestionIndex: number; }) => {
    const query = firebase.firestore()
        .collection('quizzes').doc(quizId).collection('questions')
        .orderBy('questionIndex', 'asc');
    const [questionsSnapshot, loading, error] = useCollection(query);
    let questionAndId = undefined;
    let questionsAndIds = undefined;
    if (error) {
        console.error(error);
        questionAndId = null;
        questionsAndIds = null;
    }
    if (!loading) {
        if (!questionsSnapshot) {
            console.error(`Questions data is undefined for quiz ${quizId} @ ${currentQuestionIndex}`);
            questionAndId = null;
            questionsAndIds = null;
        } else {
            questionsAndIds = questionsSnapshot.docs.map((doc: any) => ({ id: doc.id, data: doc.data() })) as Array<{ id: string; data: Question; }>;
            questionAndId = questionsAndIds.find((qai) => qai.data.questionIndex === currentQuestionIndex);
        }
    }
    return (
        <div className={styles.questionAndAnswers}>
            <div className={styles.questionPanel}>
                <QuestionCluesOrError quizId={quizId} questionAndId={questionAndId} />
                {questionsAndIds && (
                    questionAndId ?
                    <RevelationControls quizId={quizId} questionsAndIds={questionsAndIds} currentQuestionAndId={questionAndId} /> :
                    <StartQuizButton quizId={quizId} questionsAndIds={questionsAndIds} />
                )}
            </div>
            {/*TODO <RightPanel quizId={quizId} teamId={teamId} questionAndId={questionAndId} /> */}
        </div>
    );
};

const StartQuizButton = ({ quizId, questionsAndIds }: { quizId: string; questionsAndIds: Array<{ id: string; data: Question; }>; }) => {
    const [disabled, setDisabled] = useState(false);
    const unmounted = useRef(false);
    useEffect(() => () => { unmounted.current = true; }, []);
    const startQuiz = () => {
        firebase.firestore()
            .collection('quizzes').doc(quizId)
            .update({
                currentQuestionIndex: questionsAndIds[0].data.questionIndex,
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

const RevelationControls = ({ quizId, questionsAndIds, currentQuestionAndId }: { quizId: string; questionsAndIds: Array<{ id: string; data: Question; }>; currentQuestionAndId: { id: string; data: Question; };  }) => {
    const totalQuestions = questionsAndIds.length;
    const currentQuestionNumber = questionsAndIds.findIndex((qai) => qai.data.questionIndex === currentQuestionAndId.data.questionIndex) + 1;
    const query = firebase.firestore()
        .collection('quizzes').doc(quizId).collection('questions').doc(currentQuestionAndId.id).collection('clues')
        .orderBy('clueIndex', 'asc');
    const [clues, loading, error] = useCollectionData<Clue>(query);
    const [disabled, setDisabled] = useState(false);
    if (error) {
        console.error(error);
        return <div className={styles.questionPanel}><strong>There was an error loading the clues! Please try again</strong></div>;
    }
    if (loading) {
        return <div className={styles.questionPanel}>Loading clues</div>;
    }
    if (!clues) {
        console.error(`Clues data is undefined for quiz ${quizId} / question ${currentQuestionAndId.id}`);
        return <div className={styles.questionPanel}><strong>There was an error loading the clues! Please try again</strong></div>;
    }
    const totalClues = clues.length;
    const currentClueNumber = clues.findIndex((clue) => clue.clueIndex === currentQuestionAndId.data.currentClueIndex) + 1;
    const nextClue = clues.find((clue) => clue.clueIndex > currentQuestionAndId.data.currentClueIndex);
    const nextQuestion = questionsAndIds.find((qai) => qai.data.questionIndex > currentQuestionAndId.data.questionIndex);

    const goToNextClue = () => {
        if (!nextClue) {
            console.error('Tried to go to next clue, but next clue is not defined');
            return;
        }
        firebase.firestore()
            .collection('quizzes').doc(quizId).collection('questions').doc(currentQuestionAndId.id)
            .update({
                currentClueIndex: nextClue.clueIndex
            })
            .then(() => {
                setDisabled(false);
            })
            .catch((error) => {
                console.error(`Could not update quiz ${quizId} question ${currentQuestionAndId.id} to clue index ${nextClue.clueIndex}`, error);
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

const QuestionAndAnswers = ({ quizId, currentQuestionIndex, teamId}: { quizId: string; currentQuestionIndex: number; teamId: string; }) => {
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
            <RightPanel quizId={quizId} teamId={teamId} questionAndId={questionAndId} />
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

const Scoreboard = ({ quizId, }: { quizId: string; }) => {
    const query = firebase.firestore()
        .collection('teams')
        .where('quizId', '==', quizId)
        .orderBy('points', 'desc');
    const [teamsSnapshot, loading, error] = useCollection(query);
    if (error) {
        console.error(error);
        return <div><strong>There was an error loading the scoreboard! Please try again</strong></div>;
    }
    if (loading) {
        return <div></div>;
    }
    if (!teamsSnapshot) {
        console.error(`Teams snapshot is undefined for quiz ${quizId}`);
        return <div><strong>There was an error loading the scoreboard! Please try again</strong></div>;
    }
    const teams = teamsSnapshot.docs.map((teamDoc: any) => ({ id: teamDoc.id, data: teamDoc.data() }));
    return (
        <div>
            <h2>Scoreboard:</h2>
            <ul>
                {teams.map((team: { id: string; data: Team; }) => (
                    <li key={team.id}>{team.data.name}: {team.data.points}</li>
                ))}
            </ul>
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
    const answers = answersSnapshot.docs.map((answerDoc: any) => ({ id: answerDoc.id, data: answerDoc.data() }));
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

const RightPanel = ({ quizId, teamId, questionAndId }: { quizId: string; teamId: string; questionAndId: {id: string; data: Question; }|undefined|null; }) => {
    const isCaptain = window.localStorage.getItem('isCaptain') === 'true';
    return (
        <div className={styles.rightPanel}>
            <Scoreboard quizId={quizId} />
            <AnswersHistory quizId={quizId} teamId={teamId} />
            {isCaptain && <AnswerSubmitBox quizId={quizId} teamId={teamId} questionAndId={questionAndId} />}
        </div>
    );
};