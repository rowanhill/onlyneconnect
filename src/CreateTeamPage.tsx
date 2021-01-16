import React, { FormEvent, useState } from 'react';
import { useCollection, useDocumentData } from 'react-firebase-hooks/firestore';
import { Link, useHistory } from 'react-router-dom';
import firebase from './firebase';
import { createChangeHandler } from './forms/changeHandler';
import { useAuth } from './hooks/useAuth';
import { Quiz, Team } from './models';
import { Page } from './Page';
import { PrimaryButton } from './Button';

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
    const [passcode, setPasscode] = useState('');
    const onPasscodeChange = createChangeHandler(setPasscode);
    const [teamName, setTeamName] = useState('');
    const onTeamNameChange = createChangeHandler(setTeamName);
    const [disabled, setDisabled] = useState(false);
    const { user } = useAuth();
    const teamPasscode = 'changeme'; // TODO - generate a passcode/phrase

    const history = useHistory();

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setDisabled(true);

        const db = firebase.firestore();
        const batch = db.batch();
        // Create the secret doc for the team, to prove the quiz passcode is correct
        const newTeamSecretRef = db.collection('teamSecrets').doc();
        batch.set(newTeamSecretRef, {
            quizId,
            quizPasscode: passcode,
            passcode: teamPasscode,
        });
        // Create the public record of the team
        const newTeamRef = db.collection('teams').doc(newTeamSecretRef.id);
        batch.set(newTeamRef, {
            quizId,
            captainId: user!.uid,
            name: teamName,
            points: 0,
        });
        // Add the captain as a player on the team
        const playerTeamRef = db.collection('playerTeams').doc(user!.uid);
        batch.set(playerTeamRef, {
            teamId: newTeamRef.id,
            teamPasscode,
        });
        batch.commit()
            .then(() => {
                history.push(`/quiz/${quizId}`);
            })
            .catch((error) => {
                console.error("Could not create new team", error);
            });
    };

    return (
        <form onSubmit={submit}>
            <fieldset disabled={disabled}>
                <input type="text" placeholder="Quiz passcode" value={passcode} onChange={onPasscodeChange} />
                <input type="text" placeholder="Team name" value={teamName} onChange={onTeamNameChange} />
                <PrimaryButton>Create a team</PrimaryButton>
            </fieldset>
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