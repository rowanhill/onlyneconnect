import React, { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { Link } from 'react-router-dom';
import firebase from './firebase';
import { useAuth } from './hooks/useAuth';
import { CollectionQueryItem, CollectionQueryResult, useCollectionResult } from './hooks/useCollectionResult';
import { Answer, Clue, PlayerTeam, Question, Quiz, Team } from './models';
import { Card } from './Card';
import { Page } from './Page';
import { PrimaryButton } from './Button';
import styles from './QuizPage.module.css';
import { closeLastClue, revealNextClue, revealNextQuestion } from './models/quiz';
import { markAnswer, submitAnswer } from './models/answer';
import {
    QuizContext, useQuizContext,
    QuestionsContext, useQuestionsContext,
    CluesContext, useCluesContext,
    TeamsContext, useTeamsContext,
    AnswersContext, useAnswersContext,
 } from './contexts/quizPage';

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
    const teamOfCurrentPlayer = teamsResult.data && playerTeamData &&
        teamsResult.data.find((teamItem) => teamItem.id === playerTeamData.teamId);
    const isCaptain = !isQuizOwner && teamOfCurrentPlayer && teamOfCurrentPlayer.data.captainId === user?.uid;

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
            <QuizContext.Provider value={{ quizId, quiz: quizData }}>
            <QuestionsContext.Provider value={questionsResult}>
            <CluesContext.Provider value={cluesResult}>
            <TeamsContext.Provider value={teamsResult}>
            <AnswersContext.Provider value={answersResult}>
                <div className={styles.leftPanel}>
                    <div>
                        <h1 className={styles.pageTitle}>{quizData.name}</h1>
                        {joinTeamUrl && <p>Invite others to your team with this link: {joinTeamUrl.href}</p>}
                        {joinQuizUrl && <p>Invite team captains to your quiz with this link: {joinQuizUrl.href}</p>}
                    </div>
                    <CurrentQuestion currentQuestionItem={currentQuestionItem} />
                    {isQuizOwner &&
                        <QuizControls currentQuestionItem={currentQuestionItem} />
                    }
                </div>
                <div className={styles.rightPanel}>
                    <Scoreboard />
                    <Card className={styles.answersCard}>
                        <AnswersHistory isQuizOwner={isQuizOwner} />
                        {isCaptain &&
                            <AnswerSubmitBox
                                teamId={playerTeamData!.teamId}
                                questionItem={currentQuestionItem}
                                clueItem={currentClueItem}
                            />}
                    </Card>
                </div>
            </AnswersContext.Provider>
            </TeamsContext.Provider>
            </CluesContext.Provider>
            </QuestionsContext.Provider>
            </QuizContext.Provider>
            </>
        );
    }
    return <Page className={styles.quizPage}>{inner()}</Page>;
};

const QuizControls = ({ currentQuestionItem }: { currentQuestionItem?: CollectionQueryItem<Question>; }) => {
    const { data: questionsData } = useQuestionsContext();
    if (!questionsData) {
        return null;
    }
    if (currentQuestionItem) {
        return (
            <div className={styles.quizControls} data-cy="quiz-controls">
                <RevelationControls currentQuestionItem={currentQuestionItem} />
            </div>
        );
    } else {
        return (
            <div className={styles.quizControls} data-cy="quiz-controls">
                <StartQuizButton />
            </div>
        );
    }
};

const StartQuizButton = () => {
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

const RevelationControls = ({ currentQuestionItem }: { currentQuestionItem: CollectionQueryItem<Question>; }) => {
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

        revealNextQuestion(quizId, nextQuestion.id, currentClue?.id)
            .then(() => {
                setDisabled(false);
            })
            .catch((error) => {
                console.error(`Could not update quiz ${quizId} to question ${nextQuestion.id}`, error);
                setDisabled(false);
            });
        setDisabled(true);
    }
    const handleCloseLastClue = () => {
        if (!currentClue) {
            console.error('Tried to close the last clue with no currentClue set');
            return;
        }
        closeLastClue(quizId, currentClue.id)
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
            {buttonToShow === 'next-clue' && <PrimaryButton disabled={disabled} onClick={handleGoToNextClue}>Next clue</PrimaryButton>}
            {buttonToShow === 'next-question' && <PrimaryButton disabled={disabled} onClick={handleGoToNextQuestion}>Next question</PrimaryButton>}
            {buttonToShow === 'end-quiz' && <PrimaryButton disabled={disabled} onClick={handleCloseLastClue}>End quiz</PrimaryButton>}
            {buttonToShow === 'quiz-ended' && <p>You've reached the end of the quiz</p>}
            {buttonToShow === 'error' && <p>Error: There is no next clue or question, nor current clue to close</p>}
        </>
    );
};

const CurrentQuestion = ({ currentQuestionItem }: { currentQuestionItem?: CollectionQueryItem<Question>; }) => {
    const { error: questionsError } = useQuestionsContext();
    function inner() {
        if (currentQuestionItem === undefined) {
            return <>Waiting for quiz to start...</>;
        }
        if (questionsError) {
            return <strong>There was an error loading the question! Please try again.</strong>;
        }
        return <QuestionClues currentQuestionItem={currentQuestionItem} />;
    }
    return <Card className={styles.questionPanel} data-cy="clue-holder">{inner()}</Card>;
};

const QuestionClues = ({ currentQuestionItem }: { currentQuestionItem: CollectionQueryItem<Question>; }) => {
    const { data: clues, loading, error } = useCluesContext();
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
        {orderedClues.map((clue, i) => (
            <div
                key={clue.id}
                className={styles.clue + (clue.data.isRevealed ? ` ${styles.revealedClue}` : ` ${styles.unrevealedClue}`)}
                data-cy={clue.data.isRevealed ? `revealed-clue-${i}` : `unrevealed-clue-${i}`}
            >
                {clue.data.isRevealed ? clue.data.text : `(${clue.data.text})`}
            </div>
        ))}
        {Array.from(Array(4 - orderedClues.length).keys()).map((n) => (
            <div key={n} className={styles.clue + ' ' + styles.hiddenClue}></div>
        ))}
        </>
    );
};

const Scoreboard = () => {
    const { quizId } = useQuizContext();
    const { data: teamsData, loading, error } = useTeamsContext();
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
        <Card className={styles.scoreboard} data-cy="scoreboard">
            <h2>Scoreboard</h2>
            <ul>
                {teamsOrderedByScore.map((team) => (
                    <li key={team.id}>{team.data.name}: {team.data.points}</li>
                ))}
            </ul>
        </Card>
    );
};

interface AnswerMeta { answer: CollectionQueryItem<Answer>; valid: boolean; clueIndex: number; }
const AnswersHistory = ({ isQuizOwner }: { isQuizOwner: boolean; }) => {
    const { quizId, quiz } = useQuizContext();
    const { data: answersData, loading: answersLoading, error: answersError } = useAnswersContext();
    const { data: cluesData, loading: cluesLoading, error: cluesError } = useCluesContext();
    const { data: questionsData, loading: questionsLoading, error: questionsError } = useQuestionsContext();
    const { data: teamsData } = useTeamsContext();
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
    }, {} as { [id: string]: AnswerMeta[]});
    const answerGroups = quiz.questionIds
        .map((id) => ({ questionId: id, answerMetas: answerMetasByQuestionId[id] }))
        .filter((group) => !!group.answerMetas);
    const answersByQuestionByTeam = answersData.reduce((acc, answer) => {
        if (!acc[answer.data.teamId]) {
            acc[answer.data.teamId] = {};
        }
        if (!acc[answer.data.teamId][answer.data.questionId]) {
            acc[answer.data.teamId][answer.data.questionId] = [];
        }
        acc[answer.data.teamId][answer.data.questionId].push(answer);
        acc[answer.data.teamId][answer.data.questionId].sort((a, b) => a.data.submittedAt.toMillis() - b.data.submittedAt.toMillis());
        return acc;
    }, {} as { [teamId: string]: { [questionId: string]: CollectionQueryItem<Answer>[] } });
    const questionAnsweredEarlier = (answerMeta: AnswerMeta) => {
        const answersByQuestion = answersByQuestionByTeam[answerMeta.answer.data.teamId];
        const answers = answersByQuestion[answerMeta.answer.data.questionId];
        for (const answer of answers) {
            if (answer.id === answerMeta.answer.id) {
                return false;
            } else if (answer.data.correct === true) {
                return true;
            }
        }
        return false;
    };
    const markAnswerWithScoreAndCorrect = (answerMeta: AnswerMeta, score: number, correct: boolean) => {
        if (!answerMeta.valid) {
            console.error(`Tried to mark invalid question as ${correct ? 'correct' : 'incorrect'} with ${score} points`, answerMeta);
            return;
        }
        markAnswer(
            quizId,
            answerMeta.answer.id,
            answerMeta.answer.data.teamId,
            correct,
            score,
        ).catch((error) => {
            console.error(`Error when marking answer ${answerMeta.answer.id} as ${correct ? 'correct' : 'incorrect'} with ${score} points`, error);
        });
    };
    const markCorrect = (answerMeta: AnswerMeta) => {
        const score = 5 - answerMeta.clueIndex;
        markAnswerWithScoreAndCorrect(answerMeta, score, true);
    };
    const markIncorrect = (answerMeta: AnswerMeta) => {
        markAnswerWithScoreAndCorrect(answerMeta, 0, false);
    };
    return (
        <div className={styles.answersHistory} data-cy="answers-history">
            {answerGroups.map((answerGroup, groupIndex) => (
                <div key={answerGroup.questionId}>
                    <h3>Question {groupIndex + 1}</h3>
                    {answerGroup.answerMetas.map((answerMeta) => (
                        <div
                            key={answerMeta.answer.id}
                            className={styles.answer + (answerMeta.valid ? '' : (' ' + styles.invalidAnswer))}
                            data-cy={`submitted-answer-${answerMeta.answer.id}`}
                        >
                            <div className={styles.answerInfo}>
                                {isQuizOwner && teamsById[answerMeta.answer.data.teamId] && <>{teamsById[answerMeta.answer.data.teamId].data.name}:<br/></>}
                                {answerMeta.answer.data.text}{' '}
                                {(answerMeta.answer.data.points !== undefined || !isQuizOwner) &&
                                    <>({answerMeta.answer.data.points !== undefined ? answerMeta.answer.data.points : 'unscored'})</>
                                }
                            </div>
                            {isQuizOwner && answerMeta.valid && !questionAnsweredEarlier(answerMeta) &&
                                <div>
                                    {answerMeta.answer.data.correct !== true && <PrimaryButton onClick={() => markCorrect(answerMeta)}>✔️</PrimaryButton>}
                                    {answerMeta.answer.data.correct !== false && <PrimaryButton onClick={() => markIncorrect(answerMeta)}>❌</PrimaryButton>}
                                </div>
                            }
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

const AnswerSubmitBox = ({ teamId, questionItem, clueItem }: { teamId: string; questionItem: CollectionQueryItem<Question>|undefined; clueItem: CollectionQueryItem<Clue>|undefined; }) => {
    const { quizId } = useQuizContext();
    const answersResult = useAnswersContext();
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

        submitAnswer(
            quizId,
            questionItem.id,
            clueItem.id,
            teamId,
            answerText,
        )
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
            <fieldset className={styles.submitAnswerForm} disabled={submitting || !questionItem || !clueItem || hasReachedLimit || alreadyAnsweredCorrectly}>
                <input type="text" placeholder="Type your answer here" value={answerText} onChange={onAnswerChange} data-cy="answer-text" />
                <PrimaryButton data-cy="answer-submit">Submit</PrimaryButton>
            </fieldset>
        </form>
    );
};