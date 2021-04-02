import React from 'react';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { Link } from 'react-router-dom';
import firebase from './firebase';
import { useAuth } from './hooks/useAuth';
import { CollectionQueryItem, useCollectionResult } from './hooks/useCollectionResult';
import { Answer, Clue, PlayerTeam, Question, QuestionSecrets, Quiz, Team, WallInProgress } from './models';
import { Card } from './Card';
import { Page } from './Page';
import styles from './QuizPage.module.css';
import {
    QuizContext,
    QuestionsContext,
    CluesContext,
    TeamsContext,
    AnswersContext,
    PlayerTeamContext,
    WallInProgressContext,
    QuestionSecretsContext,
 } from './contexts/quizPage';
import { QuizControls } from './QuizControls';
import { CurrentQuestion } from './CurrentQuestion';
import { Scoreboard } from './Scoreboard';
import { AnswersHistory } from './AnswerHistory';
import { AnswerSubmitBox } from './AnswerSubmitBox';
import { createWipLookup } from './wallInProgressLookup';
import { CopyableText } from './CopyableText';
import { HostVideoPlayer } from './HostVideoPlayer';
import { TeamProgress } from './TeamProgress';
import { QuestionTimer } from './QuestionTimer';

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

    // Fetch question secrets
    const questionSecretsResult = useCollectionResult<QuestionSecrets>(
        isQuizOwner ?
        db.collection(`quizzes/${quizId}/questionSecrets`) :
        null
    );
    if (questionSecretsResult.error) {
        console.error('Error getting question secrets:', questionSecretsResult.error);
    }

    // Fetch clues
    let cluesQuery: firebase.firestore.Query|null = null;
    if (isQuizOwner) {
        // Get all clues
        cluesQuery = db.collection(`quizzes/${quizId}/clues`);
    } else {
        // Get only revealed clues for revealed questions
        if (questionsResult.data) {
            cluesQuery = db.collection(`quizzes/${quizId}/clues`)
                .where('isRevealed', '==', true);
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

    // Fetch wall in-progress info
    let wipQuery: firebase.firestore.Query|null = null;
    if (isQuizOwner) {
        wipQuery = db.collection(`quizzes/${quizId}/wallInProgress`);
    } else if (playerTeamData?.teamId) {
        wipQuery = db.collection(`quizzes/${quizId}/wallInProgress`)
            .where('teamId', '==', playerTeamData.teamId)
    }
    const wipResult = useCollectionResult<WallInProgress>(wipQuery);
    if (wipResult.error) {
        console.error('Error getting wall in progress info:', wipResult.error);
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
            <PlayerTeamContext.Provider value={{ teamId: playerTeamData?.teamId, isCaptain }}>
            <QuestionsContext.Provider value={questionsResult}>
            <QuestionSecretsContext.Provider value={questionSecretsResult}>
            <CluesContext.Provider value={cluesResult}>
            <TeamsContext.Provider value={teamsResult}>
            <AnswersContext.Provider value={answersResult}>
            <WallInProgressContext.Provider value={{ queryResult: wipResult, wipByTeamByClue: createWipLookup(wipResult) }}>
                <div className={styles.leftPanel}>
                    <div>
                        <h1 className={styles.pageTitle}>
                            {quizData.name}
                            {isQuizOwner && <>{' '}<Link className={styles.editLink} to={`/quiz/${quizId}/edit`}>[Edit]</Link></>}
                        </h1>
                        {joinTeamUrl && <p>
                            Invite others to your team with this link: <CopyableText value={joinTeamUrl.href} />
                        </p>}
                        {joinQuizUrl && <p>
                            Invite team captains to your quiz with this link: <CopyableText value={joinQuizUrl.href} />
                        </p>}
                    </div>
                    <CurrentQuestion currentQuestionItem={currentQuestionItem} />
                    {isQuizOwner &&
                        <Card>
                            <QuestionTimer currentQuestionItem={currentQuestionItem} currentClueItem={currentClueItem} quiz={quizData} />
                            <TeamProgress currentQuestionItem={currentQuestionItem} currentClueItem={currentClueItem} />
                            <QuizControls currentQuestionItem={currentQuestionItem} />
                        </Card>
                    }
                </div>
                <div className={styles.rightPanel}>
                    <HostVideoPlayer isQuizOwner={isQuizOwner} />
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
            </WallInProgressContext.Provider>
            </AnswersContext.Provider>
            </TeamsContext.Provider>
            </CluesContext.Provider>
            </QuestionSecretsContext.Provider>
            </QuestionsContext.Provider>
            </PlayerTeamContext.Provider>
            </QuizContext.Provider>
            </>
        );
    }
    return <Page className={styles.quizPage}>{inner()}</Page>;
};