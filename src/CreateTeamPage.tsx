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
import { Card } from './Card';

interface CreateTeamPageProps {
    quizId: string;
}

const CreateTeamPage = ({ quizId }: CreateTeamPageProps) => {
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
            <Card title="Start a new team">
                <p>If you start your own team, you'll be the team captain. Other people can join your team, but only team captains can submit answers.</p>
                <CreateTeamForm quizId={quizId} />
            </Card>
            <TeamsList quizId={quizId} />
            </>
        );
    }
    return <Page title={quiz ? `Create a team for "${quiz.name}"` : 'Create a team'}>{inner()}</Page>;
};

export default CreateTeamPage;

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
                <div>
                    <h4><label>Quiz passcode</label></h4>
                    <input type="text" placeholder="Quiz passcode" value={quizPasscode} onChange={onQuizPasscodeChange} data-cy="quiz-passcode" />
                    <p>You need the secret passcode for this quiz to create a team. If you're not sure what it is, ask your quizmaster.</p>
                </div>
                <div>
                    <h4><label>Team name</label></h4>
                    <input type="text" placeholder="Team name" value={teamName} onChange={onTeamNameChange} data-cy="team-name" />
                    <p>Your team name will be visible to the quizmaster and all players.</p>
                </div>
                <div>
                    <h4><label>Team passcode</label></h4>
                    <input type="text" placeholder="Team passcode" value={teamPasscode} onChange={onTeamPasscodeChange} data-cy="team-passcode" />
                    <p>Your team passcode can be any text. You'll need to give it to your teammates so they can join this team.</p>
                </div>
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
        <Card title="Join an existing team">
            {teamsSnapshot.docs.length > 0 ?
            <>
                <p>Pick one of the below. You'll need the team passcode to join.</p>
                <ul>
                    {teamsSnapshot.docs.map((teamDoc: any) => {
                        const team: Team = teamDoc.data();
                        return <li key={teamDoc.id}><Link to={`/team/${teamDoc.id}/join-team`}>{team.name}</Link></li>;
                    })}
                </ul>
            </> :
            <>
                <p>Sorry, nobody's started a team for this quiz yet.</p>
            </>}
        </Card>
    );
};