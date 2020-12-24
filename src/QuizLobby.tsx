import React, { ChangeEvent, FormEvent, useState } from 'react';
import { useHistory } from 'react-router-dom';
import firebase from './firebase';
import { useAuth } from './hooks/useAuth';

export interface LobbyProps {
    quizId: string;
}

export const QuizLobby = ({ quizId }: LobbyProps) => {
    return (
        <>
        <h1>Join a team</h1>
        <h2>Starting a new team?</h2>
        <p>Team captains must start the team. Only team captains can submit answers.</p>
        <p>To create a new team, enter the ID passcode for the quiz you're joining. You can get these from your quizmaster.</p>
        <CreateTeamForm quizId={quizId} />

        <h2>Want to join an existing team?</h2>
        <p>Your team captain needs to create a team then give you a joining link.</p>
        </>
    );
};

const createChangeHandler = (setValue: React.Dispatch<React.SetStateAction<string>>) => {
    return (e: ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        setValue(e.target.value);
    }
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
        });
        // Add the captain as a player on the team
        const playerTeamRef = db.collection('playerTeams').doc(user!.uid);
        batch.set(playerTeamRef, {
            teamId: newTeamRef.id,
            teamPasscode,
        });
        batch.commit()
            .then(() => {
                window.localStorage.setItem('teamId', newTeamRef.id);
                window.localStorage.setItem('isCaptain', 'true');
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
                <button>Create a team</button>
            </fieldset>
        </form>
    );
};