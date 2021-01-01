import React, { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { Link } from 'react-router-dom';
import firebase from './firebase';
import { useAuth } from './hooks/useAuth';
import { CollectionQueryData, CollectionQueryItem, CollectionQueryResult, useCollectionResult } from './hooks/useCollectionResult';
import { Answer, Clue, PlayerTeam, Question, Quiz, Team } from './models';
import styles from './QuizPage.module.css';

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
            questionsQuery = db.collection(`quizzes/${quizId}/questions`);
        } else {
            // Get only revealed questions
            questionsQuery = db.collection(`quizzes/${quizId}/questions`)
                .where('isRevealed', '==', true);
        }
    }
    const questionsResult = useCollectionResult<Question>(questionsQuery);
    if (questionsResult.error) {
        console.error('Error getting questions:', questionsResult.error);
    }

    // Find the current question item
    const currentQuestionItem: CollectionQueryItem<Question>|undefined = quizData &&
        questionsResult.data?.find((questionData) => questionData.id === quizData.currentQuestionId);

    // Fetch clues
    let cluesQuery: firebase.firestore.Query|null = null;
    if (isQuizOwner) {
        // Get all clues
        cluesQuery = db.collection(`quizzes/${quizId}/clues`);
    } else {
        // Get only revealed clues for revealed questions
        if (questionsResult.data) {
            const revealedQuestionIds = questionsResult.data.map((questionItem) => questionItem.id);
            cluesQuery = db.collection(`quizzes/${quizId}/clues`)
                .where('isRevealed', '==', true);
            if (revealedQuestionIds.length > 0) {
                cluesQuery = cluesQuery.where('questionId', 'in', revealedQuestionIds);
            }
        }
    }
    const cluesResult = useCollectionResult<Clue>(cluesQuery);
    if (cluesResult.error) {
        console.error('Error getting clues:', cluesResult.error);
    }

    // Find the current clue item - there should only be (zero or) one that's revealed but not closed
    const currentClueItem = cluesResult.data?.find((clueData) => clueData.data.revealedAt && !clueData.data.closedAt);

    // Fetch teams
    let teamsQuery: firebase.firestore.Query = db.collection('teams')
        .where('quizId', '==', quizId)
        .orderBy('points', 'desc');
    let teamsResult = useCollectionResult<Team>(teamsQuery);
    if (teamsResult.error) {
        console.error('Error getting teams:', teamsResult.error);
    }

    // Fetch team assignment
    const [playerTeamData, /*loading*/, playerTeamError] = useDocumentData<PlayerTeam>(
        user ? db.collection('playerTeams').doc(user.uid) : null
    );
    if (playerTeamError) {
        console.error('Error getting playerTeam:', playerTeamError);
    }
    const isCaptain = !isQuizOwner && teamsResult.data && playerTeamData &&
        teamsResult.data.find((teamItem) => teamItem.id === playerTeamData.teamId) !== null;

    // Fetch answers
    let answerQuery: firebase.firestore.Query|null = null;
    if (isQuizOwner) {
        answerQuery = db.collection(`quizzes/${quizId}/answers`)
            .orderBy('submittedAt', 'asc');
    } else if (playerTeamData?.teamId) {
        answerQuery = db.collection(`quizzes/${quizId}/answers`)
            .where('teamId', '==', playerTeamData.teamId)
            .orderBy('submittedAt', 'asc');
    }
    const answersResult = useCollectionResult<Answer>(answerQuery);
    if (answersResult.error) {
        console.error('Error getting answers:', answersResult.error);
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
        if (!playerTeamData && !isQuizOwner) {
            return <p>You're not part of a team. Do you need to <Link to={`/quiz/${quizId}/create-team`}>create a new team</Link>?</p>
        }
        const joinTeamUrl = (playerTeamData?.teamId && !isQuizOwner) ? new URL(`/team/${playerTeamData.teamId}/join-team`, window.location.href) : undefined;
        const joinQuizUrl = isQuizOwner ? new URL(`/quiz/${quizId}/create-team`, window.location.href) : undefined;
        return (
            <>
                <div className={styles.leftPanel}>
                    <div>
                        <h1>{quizData.name}</h1>
                        {joinTeamUrl && <p>Invite others to your team with this link: {joinTeamUrl.href}</p>}
                        {joinQuizUrl && <p>Invite team captains to your quiz with this link: {joinQuizUrl.href}</p>}
                    </div>
                    {isQuizOwner ?
                        <>
                            <CurrentQuestion
                                currentQuestionItem={currentQuestionItem}
                                questionsError={questionsResult.error}
                                cluesResult={cluesResult}
                            />
                            <QuizControls
                                questionsData={questionsResult.data}
                                currentQuestionItem={currentQuestionItem}
                                cluesResult={cluesResult}
                                quizId={quizId}
                                quiz={quizData}
                            />
                        </> :
                        <>
                            <CurrentQuestion
                                currentQuestionItem={currentQuestionItem}
                                questionsError={questionsResult.error}
                                cluesResult={cluesResult}
                            />
                        </> 
                    }
                </div>
                <div className={styles.rightPanel}>
                    <Scoreboard quizId={quizId} teamsResult={teamsResult} />
                    <AnswersHistory
                        answersResult={answersResult}
                        cluesResult={cluesResult}
                        questionsResult={questionsResult}
                        teamsResult={teamsResult}
                        isQuizOwner={isQuizOwner}
                        quizId={quizId}
                        quiz={quizData}
                    />
                    {isCaptain &&
                        <AnswerSubmitBox
                            quizId={quizId}
                            teamId={playerTeamData!.teamId}
                            questionItem={currentQuestionItem}
                            clueItem={currentClueItem}
                            answersResult={answersResult}
                        />}
                </div>
            </>
        );
    }
    return <div className={styles.quizPage}>{inner()}</div>;
};

const QuizControls = ({ questionsData, currentQuestionItem, quizId, quiz, cluesResult }: { questionsData?: CollectionQueryData<Question>; currentQuestionItem?: CollectionQueryItem<Question>; quizId: string; quiz: Quiz; cluesResult: CollectionQueryResult<Clue>; }) => {
    if (!questionsData) {
        return null;
    }
    if (currentQuestionItem) {
        return (
            <div>
                <RevelationControls quizId={quizId} quiz={quiz} questionsData={questionsData} currentQuestionItem={currentQuestionItem} cluesResult={cluesResult} />
            </div>
        );
    } else {
        return (
            <div>
                <StartQuizButton quizId={quizId} quiz={quiz} />
            </div>
        );
    }
};

const StartQuizButton = ({ quizId, quiz }: { quizId: string; quiz: Quiz; }) => {
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
    return <button disabled={disabled} onClick={startQuiz}>Start quiz</button>;
};

const RevelationControls = ({ quizId, quiz, questionsData, currentQuestionItem, cluesResult }: { quizId: string; quiz: Quiz; questionsData: CollectionQueryData<Question>; currentQuestionItem: CollectionQueryItem<Question>; cluesResult: CollectionQueryResult<Clue>; }) => {
    const { data: clues, loading, error } = cluesResult;
    const [disabled, setDisabled] = useState(false);
    if (error) {
        return <div><strong>There was an error loading the clues! Please try again</strong></div>;
    }
    if (loading || !clues) {
        return <div>Loading clues</div>;
    }
    
    // Construct an ordered array of clue items for the current question
    const cluesForQuestion = clues.filter((clue) => clue.data.questionId === quiz.currentQuestionId);
    const cluesForQuestionById = Object.fromEntries(cluesForQuestion.map((clue) => [clue.id, clue]));
    const orderedClues = currentQuestionItem.data.clueIds.map((id) => cluesForQuestionById[id]);
    
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

    const goToNextClue = () => {
        if (!nextClue) {
            console.error('Tried to go to next clue, but next clue is not defined');
            return;
        }
        const db = firebase.firestore();
        const batch = db.batch();

        // Update the current clue, if any, to set the closedAt time
        if (currentClue) {
            const currentClueDoc = db.doc(`quizzes/${quizId}/clues/${currentClue.id}`);
            batch.update(currentClueDoc, {
                closedAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
        }

        // Update the next clue to set the revealedAt time, and set isRevealed to true
        const nextClueDoc = db.doc(`quizzes/${quizId}/clues/${nextClue.id}`);
        batch.update(nextClueDoc,{
            isRevealed: true,
            revealedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        
        batch.commit()
            .then(() => {
                setDisabled(false);
            })
            .catch((error) => {
                console.error(`Could not update quiz ${quizId} to reveal clue ${nextClue.id}`, error);
                setDisabled(false);
            });
        setDisabled(true);
    };
    const goToNextQuestion = () => {
        if (!nextQuestion) {
            console.error('Tried to go to next question, but next question is not defined');
            return;
        }
        const db = firebase.firestore();
        const batch = db.batch();

        // Close the current clue, if any, for answer submissions
        if (currentClue) {
            const currentClueDoc = db.doc(`quizzes/${quizId}/clues/${currentClue.id}`);
            batch.update(currentClueDoc, {
                closedAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
        }

        // Reveal the next question
        const nextQuestionDoc = db.doc(`quizzes/${quizId}/questions/${nextQuestion.id}`);
        batch.update(nextQuestionDoc, {
            isRevealed: true,
        });

        // Move the quiz to the next question
        const quizDoc = db.doc(`quizzes/${quizId}`);
        batch.update(quizDoc, {
            currentQuestionId: nextQuestion.id
        });

        batch.commit()
            .then(() => {
                setDisabled(false);
            })
            .catch((error) => {
                console.error(`Could not update quiz ${quizId} to question ${nextQuestion.id}`, error);
                setDisabled(false);
            });
        setDisabled(true);
    }
    const closeLastClue = () => {
        if (!currentClue) {
            console.error('Tried to close the last clue with no currentClue set');
            return;
        }
        firebase.firestore().doc(`quizzes/${quizId}/clues/${currentClue.id}`)
            .update({
                closedAt: firebase.firestore.FieldValue.serverTimestamp(),
            })
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
            {buttonToShow === 'next-clue' && <button disabled={disabled} onClick={goToNextClue}>Next clue</button>}
            {buttonToShow === 'next-question' && <button disabled={disabled} onClick={goToNextQuestion}>Next question</button>}
            {buttonToShow === 'end-quiz' && <button disabled={disabled} onClick={closeLastClue}>End quiz</button>}
            {buttonToShow === 'quiz-ended' && <p>You've reached the end of the quiz</p>}
            {buttonToShow === 'error' && <p>Error: There is no next clue or question, nor current clue to close</p>}
        </>
    );
};

const CurrentQuestion = ({ currentQuestionItem, questionsError, cluesResult }: { currentQuestionItem?: CollectionQueryItem<Question>; questionsError?: Error; cluesResult: CollectionQueryResult<Clue>; }) => {
    function inner() {
        if (currentQuestionItem === undefined) {
            return <>Waiting for quiz to start...</>;
        }
        if (questionsError) {
            return <strong>There was an error loading the question! Please try again.</strong>;
        }
        return <QuestionClues currentQuestionItem={currentQuestionItem} cluesResult={cluesResult} />;
    }
    return <div className={styles.questionPanel}>{inner()}</div>;
};

const QuestionClues = ({ currentQuestionItem, cluesResult }: { currentQuestionItem: CollectionQueryItem<Question>; cluesResult: CollectionQueryResult<Clue>; }) => {
    const { data: clues, loading, error } = cluesResult;
    if (error) {
        return <strong>There was an error loading the clues! Please try again</strong>;
    }
    if (loading) {
        return <>Loading clues</>;
    }
    const questionClues = clues?.filter((clue) => clue.data.questionId === currentQuestionItem.id);
    if (!questionClues || questionClues.length === 0) {
        return <>Waiting for first clue...</>;
    }
    const questionCluesById = Object.fromEntries(questionClues.map((clue) => [clue.id, clue]));
    const orderedClues = currentQuestionItem.data.clueIds
        .map((id) => questionCluesById[id])
        .filter((clue) => !!clue);
    return (
        <>
        {orderedClues.map((clue) => (
            <div key={clue.id} className={styles.clue + (clue.data.isRevealed ? '' : ` ${styles.unrevealedClue}`)}>
                {clue.data.isRevealed ? clue.data.text : `(${clue.data.text})`}
            </div>
        ))}
        {Array.from(Array(4 - orderedClues.length).keys()).map((n) => (
            <div key={n} className={styles.clue + ' ' + styles.hiddenClue}></div>
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
    const teamsOrderedByScore = teamsData.sort((a, b) => b.data.points - a.data.points);
    return (
        <div>
            <h2>Scoreboard:</h2>
            <ul>
                {teamsOrderedByScore.map((team) => (
                    <li key={team.id}>{team.data.name}: {team.data.points}</li>
                ))}
            </ul>
        </div>
    );
};

const AnswersHistory = ({ answersResult, cluesResult, questionsResult, teamsResult, isQuizOwner, quizId, quiz }: { answersResult: CollectionQueryResult<Answer>; cluesResult: CollectionQueryResult<Clue>; questionsResult: CollectionQueryResult<Question>; teamsResult: CollectionQueryResult<Team>; isQuizOwner: boolean; quizId: string; quiz: Quiz }) => {
    const { data: answersData, loading: answersLoading, error: answersError } = answersResult;
    const { data: cluesData, loading: cluesLoading, error: cluesError } = cluesResult;
    const { data: questionsData, loading: questionsLoading, error: questionsError } = questionsResult;
    const { data: teamsData } = teamsResult;
    if (answersError || cluesError || questionsError) {
        return <div className={styles.answersHistory}><strong>There was an error loading your answers! Please try again</strong></div>;
    }
    if (answersLoading || !answersData || cluesLoading || !cluesData || questionsLoading || !questionsData) {
        return <div className={styles.answersHistory}></div>;
    }
    const cluesById = Object.fromEntries(cluesData.map((clue) => [clue.id, clue]));
    const questionsById = Object.fromEntries(questionsData.map((question) => [question.id, question]));
    const teamsById = isQuizOwner && teamsData ? Object.fromEntries(teamsData.map((team) => [team.id, team])) : {};
    const answerMetasByQuestionId = answersData.reduce((acc, answer) => {
        if (!acc[answer.data.questionId]) {
            acc[answer.data.questionId] = [];
        }
        const clue = cluesById[answer.data.clueId];
        const valid = clue && !!answer.data.submittedAt && !!clue.data.revealedAt &&
            answer.data.submittedAt.toMillis() >= clue.data.revealedAt.toMillis() &&
            (!clue.data.closedAt || answer.data.submittedAt.toMillis() <= clue.data.closedAt.toMillis());
        const question = questionsById[answer.data.questionId];
        const clueIndex = question.data.clueIds.indexOf(answer.data.clueId);
        acc[answer.data.questionId].push({ answer, valid, clueIndex });
        return acc;
    }, {} as { [id: string]: { answer: CollectionQueryItem<Answer>; valid: boolean; clueIndex: number; }[]});
    const answerGroups = quiz.questionIds
        .map((id) => ({ questionId: id, answerMetas: answerMetasByQuestionId[id] }))
        .filter((group) => !!group.answerMetas);
    const scoredAnswerByQuestionByTeamId = answersData.reduce((acc, answer) => {
        if (!acc[answer.data.teamId]) {
            acc[answer.data.teamId] = {};
        }
        if (answer.data.correct === true) {
            acc[answer.data.teamId][answer.data.questionId] = answer.data.clueId;
        }
        return acc;
    }, {} as { [teamId: string]: { [questionId: string]: string } });
    const markAnswer = (answerMeta: { answer: CollectionQueryItem<Answer>; valid: boolean; clueIndex: number; }, score: number, correct: boolean) => {
        if (!answerMeta.valid) {
            console.error(`Tried to mark invalid question as ${correct ? 'correct' : 'incorrect'} with ${score} points`, answerMeta);
            return;
        }
        const db = firebase.firestore();
        db.runTransaction(async (transaction) => {
            try {
                const answerDoc = db.doc(`quizzes/${quizId}/answers/${answerMeta.answer.id}`);
                const freshAnswer = await transaction.get(answerDoc);
                const oldScore = freshAnswer.data()?.points || 0;
                const teamDoc = db.doc(`teams/${answerMeta.answer.data.teamId}`);
                transaction.update(answerDoc, {
                    correct,
                    points: score,
                });
                transaction.update(teamDoc, {
                    points: firebase.firestore.FieldValue.increment(score - oldScore),
                });
            } catch (error) {
                console.error(`Error when marking answer ${answerMeta.answer.id} as ${correct ? 'correct' : 'incorrect'} with ${score} points`, error);
            }
        });
    };
    const markCorrect = (answerMeta: { answer: CollectionQueryItem<Answer>; valid: boolean; clueIndex: number; }) => {
        const score = 5 - answerMeta.clueIndex;
        markAnswer(answerMeta, score, true);
    };
    const markIncorrect = (answerMeta: { answer: CollectionQueryItem<Answer>; valid: boolean; clueIndex:number; }) => {
        markAnswer(answerMeta, 0, false);
    };
    return (
        <div className={styles.answersHistory}>
            {answerGroups.map((answerGroup, groupIndex) => (
                <div key={answerGroup.questionId}>
                    <h3>Question {groupIndex + 1}</h3>
                    {answerGroup.answerMetas.map((answerMeta) => (
                        <div key={answerMeta.answer.id} className={styles.answer + (answerMeta.valid ? '' : (' ' + styles.invalidAnswer))}>
                            <div className={styles.answerInfo}>
                                {isQuizOwner && teamsById[answerMeta.answer.data.teamId] && <>{teamsById[answerMeta.answer.data.teamId].data.name}:<br/></>}
                                {answerMeta.answer.data.text}{' '}
                                {(answerMeta.answer.data.points !== undefined || !isQuizOwner) &&
                                    <>({answerMeta.answer.data.points !== undefined ? answerMeta.answer.data.points : 'unscored'})</>
                                }
                            </div>
                            {isQuizOwner && answerMeta.valid &&
                            (scoredAnswerByQuestionByTeamId[answerMeta.answer.data.teamId][answerMeta.answer.data.questionId] === undefined || scoredAnswerByQuestionByTeamId[answerMeta.answer.data.teamId][answerMeta.answer.data.questionId] === answerMeta.answer.data.clueId) &&
                            <div>
                                <button onClick={() => markCorrect(answerMeta)}>✔️</button>
                                <button onClick={() => markIncorrect(answerMeta)}>❌</button>
                            </div>}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

function hasReachedAnswerLimit(
    clueItem: CollectionQueryItem<Clue>|undefined,
    questionItem: CollectionQueryItem<Question>|undefined,
    answersResult: CollectionQueryResult<Answer>,
    teamId: string,
): boolean {
    if (!answersResult.data) {
        return false;
    }
    if (questionItem && questionItem.data.answerLimit) {
        const answersForQuestion = answersResult.data.filter((answer) => answer.data.questionId === questionItem.id && answer.data.teamId === teamId);
        if (answersForQuestion.length >= questionItem.data.answerLimit) {
            return true;
        }
    }
    if (clueItem && clueItem.data.answerLimit) {
        const answersForClue = answersResult.data.filter((answer) => answer.data.clueId === clueItem.id && answer.data.teamId === teamId);
        if (answersForClue.length >= clueItem.data.answerLimit) {
            return true;
        }
    }
    return false;
}

function hasAnsweredQuestionCorrectly(
    questionItem: CollectionQueryItem<Question>|undefined,
    answersResult: CollectionQueryResult<Answer>,
    teamId: string,
): boolean {
    if (!questionItem || !answersResult.data) {
        return false;
    }
    return answersResult.data.some((answer) => answer.data.questionId === questionItem.id && answer.data.teamId === teamId && answer.data.correct === true);
}

const AnswerSubmitBox = ({ quizId, teamId, questionItem, clueItem, answersResult }: { quizId: string; teamId: string; questionItem: CollectionQueryItem<Question>|undefined; clueItem: CollectionQueryItem<Clue>|undefined; answersResult: CollectionQueryResult<Answer>; }) => {
    const [answerText, setAnswerText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const hasReachedLimit = hasReachedAnswerLimit(clueItem, questionItem, answersResult, teamId);
    const alreadyAnsweredCorrectly = hasAnsweredQuestionCorrectly(questionItem, answersResult, teamId);
    const onAnswerChange = (e: ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        setAnswerText(e.target.value);
    };
    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!questionItem) {
            console.error('Tried to submit an answer without a current question');
            return;
        }
        if (!clueItem) {
            console.error('Tried to submit an answer without a current clue');
            return;
        }

        setSubmitting(true);

        const db = firebase.firestore();
        db.collection('quizzes').doc(quizId).collection('answers').add({
            questionId: questionItem.id,
            clueId: clueItem.id,
            teamId,
            text: answerText,
            submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
        })
        .then(() => {
            setSubmitting(false);
            setAnswerText('');
        })
        .catch((error) => {
            console.error("Could not submit answer", error);
        });
    };
    return (
        <form onSubmit={submit}>
            <fieldset disabled={submitting || !questionItem || !clueItem || hasReachedLimit || alreadyAnsweredCorrectly}>
                <input type="text" placeholder="Type your answer here" value={answerText} onChange={onAnswerChange} />
                <button>Submit</button>
            </fieldset>
        </form>
    );
};