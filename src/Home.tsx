import React from 'react';
import { Link } from 'react-router-dom';
import firebase from './firebase';
import { useAuth } from './hooks/useAuth';
import { useCollectionResult } from './hooks/useCollectionResult';
import { Quiz } from './models';
import { Page } from './Page';
import buttonStyles from './button.module.css';

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
        <Page>
            <h1>Onlyne Connect</h1>
            <p>You're logged in with {user?.email}. If that's not you, you can <button className={buttonStyles.asLink} onClick={signOut}>sign out</button>.</p>
            <p>If you'd like to play a quiz, you'll need an invitation link from the quiz owner (to start a team) or your team captain (to join a team).</p>
            {ownedQuizzes.data !== undefined &&
            <>
                <h2>Quizzes</h2>
                {ownedQuizzes.data.length > 0 ?
                    <>
                        <p>You can edit one of your existing quizzes:</p>
                        <ul>
                            {ownedQuizzes.data.map((quiz) => (
                                <li key={quiz.id}><Link to={`/quiz/${quiz.id}/edit`}>{quiz.data.name}</Link></li>
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
        </Page>
    );
};