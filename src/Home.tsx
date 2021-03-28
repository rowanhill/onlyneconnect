import React from 'react';
import { Link } from 'react-router-dom';
import firebase from './firebase';
import { useAuth } from './hooks/useAuth';
import { useCollectionResult } from './hooks/useCollectionResult';
import { Quiz } from './models';
import { Page } from './Page';
import { LinkButton, DangerButton, FlashMessageButton } from './Button';
import { GameExplanation } from './GameExplanation';

export const Home = () => {
    const db = firebase.firestore();
    const { user } = useAuth();
    const ownedQuizzes = useCollectionResult<Quiz>( user ? db.collection('quizzes').where('ownerId', '==', user.uid) : null);
    if (ownedQuizzes.error) {
        console.error('Could not load owned quizzes', ownedQuizzes.error);
    }
    const signOut = () => {
        firebase.auth().signOut()
    };
    return (
        <Page title={"Onlyne Connect"}>
            <p>You're logged in with {user?.email}. If that's not you, you can <LinkButton onClick={signOut}>sign out</LinkButton>.</p>
            <p>If you'd like to play a quiz, you'll need an invitation link from the quiz owner (to start a team) or your team captain (to join a team).</p>
            {ownedQuizzes.data !== undefined &&
            <>
                <h2>Quizzes</h2>
                {ownedQuizzes.data.length > 0 ?
                    <>
                        <p>You can edit one of your existing quizzes:</p>
                        <ul>
                            {ownedQuizzes.data.map((quiz) => (
                                <li key={quiz.id}>
                                    <Link to={`/quiz/${quiz.id}/edit`}>{quiz.data.name}</Link>{' '}
                                    <ResetButton quizId={quiz.id} />
                                </li>
                            ))}
                        </ul>
                        <p>Or you could <Link to="/quiz/create">create a new one</Link>.</p>
                    </> :
                    <>
                        <p>You don't own any quizzes. Would you like to <Link to="/quiz/create">create a new one</Link>?</p>
                    </>
                }
            </>
            }
            <GameExplanation />
        </Page>
    );
};

const ResetButton = ({ quizId }: { quizId: string; }) => {
    const reset = () => {
        const resetQuiz = firebase.functions().httpsCallable('resetQuiz');
        return resetQuiz({ quizId })
            .catch((e) => console.error('Error resetting quiz', e));
    };
    return (
        <FlashMessageButton
            component={DangerButton}
            performAction={reset}
            labelTexts={{ normal: 'Reset', success: 'Done!', error: 'Error!' }}
        />
    );
};