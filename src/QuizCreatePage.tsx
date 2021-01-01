import React, { ChangeEvent, FormEvent, useState } from 'react';
import { Redirect } from 'react-router-dom';
import firebase from './firebase';
import { useAuth } from './hooks/useAuth';

export const QuizCreatePage = () => {
    const { user } = useAuth();
    const [quizName, setQuizName] = useState('');
    const [passcode, setPasscode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createdQuizId, setCreatedQuizId] = useState<string|null>(null);

    if (createdQuizId) {
        return <Redirect to={`/quiz/${createdQuizId}/edit`} />;
    }

    const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
        setQuizName(e.target.value);
    };

    const handlePasscodeChange = (e: ChangeEvent<HTMLInputElement>) => {
        setPasscode(e.target.value);
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) {
            console.error("Tried to create quiz without a user");
            return;
        }
        setIsSubmitting(true);
        const db = firebase.firestore();
        const batch = db.batch();
        const secretsDoc = db.collection('quizSecrets').doc();
        batch.set(secretsDoc, { passcode });
        const quizDoc = db.doc(`quizzes/${secretsDoc.id}`);
        batch.set(quizDoc, { name: quizName, ownerId: user.uid, questionIds: [], currentQuestionId: null });
        batch.commit()
            .then(() => setCreatedQuizId(quizDoc.id))
            .catch((error) => console.error('Failed to create quiz: ', error))
            .finally(() => setIsSubmitting(false));
    };

    return (
        <div>
            <h1>Create a new quiz</h1>
            <form onSubmit={handleSubmit}>
                <fieldset disabled={isSubmitting}>
                    <input type="text" placeholder="Quiz name" onChange={handleNameChange} value={quizName} />
                    <input type="text" placeholder="Passcode" onChange={handlePasscodeChange} value={passcode} />
                    <button>Create</button>
                </fieldset>
            </form>
        </div>
    )
};