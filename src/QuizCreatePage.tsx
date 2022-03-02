import React, { FormEvent, useState } from 'react';
import { Redirect } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Page } from './Page';
import { Card } from './Card';
import { PrimaryButton } from './Button';
import { createQuiz } from './models/quiz';
import formStyles from './form.module.css';
import { createChangeHandler } from './forms/changeHandler';

const QuizCreatePage = () => {
    const { user } = useAuth();
    const [quizName, setQuizName] = useState('');
    const [passcode, setPasscode] = useState<string|null>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createdQuizId, setCreatedQuizId] = useState<string|null>(null);

    if (createdQuizId) {
        return <Redirect to={`/quiz/${createdQuizId}/edit`} />;
    }

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
                            <input type="text" placeholder="Quiz name" onChange={createChangeHandler(setQuizName)} value={quizName} name="quiz-title" data-cy="quiz-name" />
                            <p className={formStyles.fieldDescription}>The quiz name is the title your quiz will have. All players will be able to see this name.</p>
                        </div>
                        <div>
                            <h4 className={formStyles.fieldTitle}><label>Use a passcode?</label></h4>
                            <input type="checkbox" onChange={(e) => setPasscode(e.target.checked ? '' : null)} checked={passcode !== null} data-cy="use-passcode" />
                            <p className={formStyles.fieldDescription}>Without a passcode, anyone with the quiz URL will be able to create teams.</p>
                        </div>
                        {passcode !== null &&
                            <div>
                                <h4 className={formStyles.fieldTitle}><label>Passcode</label></h4>
                                <input type="text" placeholder="Passcode" onChange={createChangeHandler(setPasscode)} value={passcode} data-cy="passcode" />
                                <p className={formStyles.fieldDescription}>The passcode is a secret phrase people must enter to create a team.</p>
                            </div>
                        }
                        <PrimaryButton data-cy="submit">Create</PrimaryButton>
                    </fieldset>
                </form>
            </Card>
        </Page>
    )
};

export default QuizCreatePage;