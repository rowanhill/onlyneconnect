import React, { ChangeEvent, FormEvent, useState } from 'react';
import { Redirect } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Page } from './Page';
import { Card } from './Card';
import { PrimaryButton } from './Button';
import { createQuiz } from './models/quiz';
import formStyles from './form.module.css';

const QuizCreatePage = () => {
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
        createQuiz(quizName, passcode, user.uid)
            .then((quizId) => setCreatedQuizId(quizId))
            .catch((error) => console.error('Failed to create quiz: ', error))
            .finally(() => setIsSubmitting(false));
    };

    return (
        <Page title="Create a new quiz">
            <Card title="Quiz basics">
                <form onSubmit={handleSubmit}>
                    <fieldset disabled={isSubmitting}>
                        <div>
                            <h4 className={formStyles.fieldTitle}><label>Quiz name</label></h4>
                            <input type="text" placeholder="Quiz name" onChange={handleNameChange} value={quizName} name="quiz-title" />
                            <p className={formStyles.fieldDescription}>The quiz name is the title your quiz will have. All players will be able to see this name.</p>
                        </div>
                        <div>
                            <h4 className={formStyles.fieldTitle}><label>Passcode</label></h4>
                            <input type="text" placeholder="Passcode" onChange={handlePasscodeChange} value={passcode} />
                            <p className={formStyles.fieldDescription}>The passcode is a secret phrase people must enter to create a team.</p>
                        </div>
                        <PrimaryButton>Create</PrimaryButton>
                    </fieldset>
                </form>
            </Card>
        </Page>
    )
};

export default QuizCreatePage;