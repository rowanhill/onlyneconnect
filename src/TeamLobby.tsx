import React, { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import firebase from './firebase';
import { useAuth } from './hooks/useAuth';

type UseTeamResult = {
    error: firebase.firestore.FirestoreError,
    loading: false,
    team: null,
} | {
    loading: true,
    error: null,
    team: null,
} | {
    loading: false,
    error: null,
    team: firebase.firestore.DocumentSnapshot<firebase.firestore.DocumentData>,
};
function useTeam(id: string): UseTeamResult {
    // initialize our default state
    const [error, setError] = React.useState<firebase.firestore.FirestoreError|null>(null);
    const [loading, setLoading] = React.useState(true);
    const [team, setTeam] = React.useState<firebase.firestore.DocumentSnapshot<firebase.firestore.DocumentData>|null>(null);

    // when the id attribute changes (including mount)
    // subscribe to the recipe document and update
    // our state when it changes.
    useEffect(() => {
        const unsubscribe = firebase.firestore()
            .collection('teams')
            .doc(id)
            .onSnapshot((doc) => {
                setTeam(doc);
                setLoading(false);
            },
            (err) => {
                setLoading(false);
                setError(err);
            });
        // returning the unsubscribe function will ensure that
        // we unsubscribe from document changes when our id
        // changes to a different value.
        return () => unsubscribe()
    }, [id]);
  
    return {
        error,
        loading,
        team,
    } as UseTeamResult;
}

export interface LobbyProps {
    teamId: string;
}

export const TeamLobby = ({ teamId }: LobbyProps) => {
    const teamResult = useTeam(teamId);
    return (
        <>
        <h1>Join a team</h1>
        <h2>Joining an existing team?</h2>
        <p>If you're captain has made a team, enter your team's passcode. You can get this from your captain.</p>
        {!teamResult.loading && teamResult.error === null && teamResult.team &&
            <>
            <JoinTeamForm teamId={teamId} quizId={teamResult.team.data()!.quizId} />
            
            <h2>Want to start your own team?</h2>
            <p>If you'd rather start your own team (as captain), you can <Link to={`/quiz/${teamResult.team.data()!.quizId}/lobby`}>click here</Link>.</p>
            </>
        }
        </>
    );
};

const createChangeHandler = (setValue: React.Dispatch<React.SetStateAction<string>>) => {
    return (e: ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        setValue(e.target.value);
    }
};

const JoinTeamForm = ({ teamId, quizId }: { teamId: string; quizId: string; }) => {
    const [passcode, setPasscode] = useState('');
    const onPasscodeChange = createChangeHandler(setPasscode);
    const [disabled, setDisabled] = useState(false);
    const { user } = useAuth();

    const history = useHistory();

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setDisabled(true);

        const db = firebase.firestore();
        db.collection('playerTeams').doc(user!.uid).set({
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
                <input type="text" placeholder="Team passcode" value={passcode} onChange={onPasscodeChange} />
                <button>Join a team</button>
            </fieldset>
        </form>
    );
};