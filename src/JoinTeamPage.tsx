import React, { ChangeEvent, FormEvent, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import firebase from './firebase';
import { useAuth } from './hooks/useAuth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { PlayerTeam, Team } from './models';
import commonStyles from './common.module.css';

interface JoinTeamPageProps {
    teamId: string;
}

export const JoinTeamPage = ({ teamId }: JoinTeamPageProps) => {
    const { user } = useAuth();
    const [teamData, loading, error] = useDocumentData<Team>(firebase.firestore().collection('teams').doc(teamId));
    const [playerTeam] = useDocumentData<PlayerTeam>(
        user ? firebase.firestore().collection('playerTeams').doc(user.uid) : null
    );

    function inner() {
        if (error) {
            console.error(error);
            return <p>There was an error trying to load the team. Please try again.</p>;
        }
        if (loading) {
            return <p>Loading your team lobby...</p>;
        }
        if (!teamData) {
            console.error('Team data is undefined for id ' + teamId);
            return <p>There was an error loading the quiz! Please try again.</p>;
        }

        return (
            <>
            <h1>Join {teamData.name}</h1>
            {playerTeam?.teamId === teamId ?
                <p>You're already a member of this team. Would you like to <Link to={`/quiz/${teamData.quizId}`}>go to your quiz</Link>?</p> :
                <p>Careful! You're already a member of a different team. You can only be a member in one team at once.</p>
            }
            <p>If you're captain has made a team, enter your team's passcode. You can get this from your captain.</p>
            <JoinTeamForm teamId={teamId} quizId={teamData.quizId} />
            
            <h2>Want to start your own team?</h2>
            <p>If you'd rather start your own team (as captain), you can <Link to={`/quiz/${teamData.quizId}/create-team`}>click here</Link>.</p>
            </>
        );
    }
    return <div className={commonStyles.page}>{inner()}</div>;
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
            teamId,
            teamPasscode: passcode,
        })
        .then(() => {
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