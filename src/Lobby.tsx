import React, { ChangeEvent, FormEvent, useState } from 'react';
import { useHistory } from 'react-router-dom';
import firebase from './firebase';
import { useAuth } from './hooks/useAuth';

export interface LobbyProps {
    quizId: string;
}

export const Lobby = ({ quizId }: LobbyProps) => {
    return (
        <>
        <h1>Join a team</h1>
        <h2>Starting a new team?</h2>
        <p>Team captains must start the team. Only team captains can submit answers.</p>
        <p>To create a new team, enter the ID passcode for the quiz you're joining. You can get these from your quizmaster.</p>
        <CreateTeamForm quizId={quizId} />

        <h2>Joining an existing team?</h2>
        <p>If you're captain has made a team, enter your team's passcode. You can get this from your captain.</p>
        <JoinTeamForm quizId={quizId} />
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
        db.collection("quizzes").doc(quizId).collection('teams').add({
            captainId: user!.uid,
            quizPasscode: passcode,
            passcode: teamPasscode,
            name: teamName,
        })
        .then((docRef) => {
            window.localStorage.setItem('teamId', docRef.id);
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

const JoinTeamForm = ({ quizId }: { quizId: string }) => {
    const [teamId, setTeamId] = useState('');
    const onTeamIdChange = createChangeHandler(setTeamId);
    const [passcode, setPasscode] = useState('');
    const onPasscodeChange = createChangeHandler(setPasscode);
    const [disabled, setDisabled] = useState(false);
    const { user } = useAuth();

    const history = useHistory();

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setDisabled(true);

        const db = firebase.firestore();
        db.collection("quizzes").doc(quizId).collection('playerTeams').doc(user!.uid).set({
            team: teamId,
            teamPasscode: passcode,
        })
        .then(() => {
            window.localStorage.setItem('teamId', teamId);
            window.localStorage.setItem('isCaptain', 'false');
            history.push(`/quiz/${quizId}`);
        })
        .catch((error) => {
            console.error("Could not join team", error);
        });
    };

    return (
        <form onSubmit={submit}>
            <fieldset disabled={disabled}>
                <input type="text" placeholder="Team ID" value={teamId} onChange={onTeamIdChange} />
                <input type="text" placeholder="Team passcode" value={passcode} onChange={onPasscodeChange} />
                <button>Join a team</button>
            </fieldset>
        </form>
    );
};