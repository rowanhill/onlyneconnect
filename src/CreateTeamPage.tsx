import React, { FormEvent, useState } from 'react';
import { useCollection, useDocumentData } from 'react-firebase-hooks/firestore';
import { Link, useHistory } from 'react-router-dom';
import firebase from './firebase';
import { createTeam } from './models/team';
import { createChangeHandler } from './forms/changeHandler';
import { useAuth } from './hooks/useAuth';
import { Quiz, Team } from './models';
import { Page } from './Page';
import { PrimaryButton } from './Button';
import styles from './CreateTeamPage.module.css';

interface CreateTeamPageProps {
    quizId: string;
}

export const CreateTeamPage = ({ quizId }: CreateTeamPageProps) => {
    const [quiz, quizLoading, quizError] = useDocumentData<Quiz>(firebase.firestore().collection('quizzes').doc(quizId));
    function inner() {
        if (quizError) {
            console.error(quizError);
            return <p>There was an error loading the quiz. Try again later.</p>
        }
        if (quizLoading) {
            return <p>Loading your quiz lobby...</p>
        }
        if (!quiz) {
            console.error(`No doc data found for quiz id ${quizId}`);
            return <p>There was an error loading the quiz. Try again later.</p>
        }
        return (
            <>
            <h2>Starting a new team?</h2>
            <p>Team captains must start the team. Only team captains can submit answers.</p>
            <p>To create a new team, enter the ID passcode for the quiz you're joining. You can get these from your quizmaster.</p>
            <CreateTeamForm quizId={quizId} />
            <TeamsList quizId={quizId} />
            </>
        );
    }
    return <Page title={quiz ? `Join a team in ${quiz.name}` : 'Join a team'}>{inner()}</Page>;
};

const CreateTeamForm = ({ quizId }: { quizId: string }) => {
    const [quizPasscode, setQuizPasscode] = useState('');
    const onQuizPasscodeChange = createChangeHandler(setQuizPasscode);
    const [teamName, setTeamName] = useState('');
    const onTeamNameChange = createChangeHandler(setTeamName);
    const [teamPasscode, setTeamPasscode] = useState('');
    const onTeamPasscodeChange = createChangeHandler(setTeamPasscode);
    const [disabled, setDisabled] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string|null>(null);
    const { user } = useAuth();

    const history = useHistory();

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setDisabled(true);
        setErrorMessage(null);

        createTeam(quizId, quizPasscode, teamName, teamPasscode, user?.uid!)
            .then(() => {
                history.push(`/quiz/${quizId}`);
            })
            .catch((error) => {
                console.error("Could not create new team", error);
                setErrorMessage('Something went wrong. The team wasn\'t created. Make sure you have the right passcode!');
                setDisabled(false);
            });
    };

    return (
        <form onSubmit={submit}>
            <fieldset disabled={disabled}>
                <input type="text" placeholder="Quiz passcode" value={quizPasscode} onChange={onQuizPasscodeChange} data-cy="quiz-passcode" />
                <input type="text" placeholder="Team name" value={teamName} onChange={onTeamNameChange} data-cy="team-name" />
                <input type="text" placeholder="Team passcode" value={teamPasscode} onChange={onTeamPasscodeChange} data-cy="team-passcode" />
                <PrimaryButton data-cy="submit">Create a team</PrimaryButton>
            </fieldset>
            {errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}
        </form>
    );
};

const TeamsList = ({ quizId }: { quizId: string }) => {
    const [teamsSnapshot, teamsLoading, teamsError] = useCollection(
        firebase.firestore().collection('teams').where('quizId', '==', quizId));
    if (teamsError) {
        console.error('Error loading teams list', teamsError);
        return null;
    }
    if (teamsLoading || !teamsSnapshot) {
        return null;
    }
    return (
        <>
        <h2>Want to join an existing team?</h2>
        <p>Pick one of the below. You'll need the team passcode to join.</p>
        <ul>
            {teamsSnapshot.docs.map((teamDoc: any) => {
                const team: Team = teamDoc.data();
                return <li key={teamDoc.id}><Link to={`/team/${teamDoc.id}/join-team`}>{team.name}</Link></li>;
            })}
        </ul>
        </>
    );
};