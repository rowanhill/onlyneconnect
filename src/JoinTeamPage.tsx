import React, { FormEvent, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import firebase from './firebase';
import { useAuth } from './hooks/useAuth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { PlayerTeam, Team } from './models';
import { Page } from './Page';
import { PrimaryButton } from './Button';
import styles from './JoinTeamPage.module.css';
import { joinPlayerToTeam } from './models/team';
import { Card } from './Card';
import { createChangeHandler } from './forms/changeHandler';
import formStyles from './form.module.css';

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
            <Card title={teamData ? `Join "${teamData.name}"` : 'Join this team'}>
                {playerTeam && playerTeam.teamId === teamId &&
                    <p>You're already a member of this team. Would you like to <Link to={`/quiz/${teamData.quizId}`}>go to your quiz</Link>?</p>
                }
                {playerTeam && playerTeam.teamId !== teamId &&
                    <p>Careful! You're already a member of a different team. You can only be a member of one team at once,
                        so if you join this team you'll be leaving your current team.</p>
                }
                <JoinTeamForm teamId={teamId} team={teamData} quizId={teamData.quizId} />
            </Card>
            <Card title="Start your own team">
                <p>If you'd rather start your own team (as captain), you can <Link to={`/quiz/${teamData.quizId}/create-team`}>click here</Link>.</p>
            </Card>
            </>
        );
    }
    return <Page>{inner()}</Page>;
};

const JoinTeamForm = ({ teamId, team, quizId }: { teamId: string; team: Team; quizId: string; }) => {
    const teamPasscodeRequired = team.requireTeamPasscode === true || team.requireTeamPasscode === undefined;
    const [passcode, setPasscode] = useState('');
    const onPasscodeChange = createChangeHandler(setPasscode);
    const [disabled, setDisabled] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string|null>(null);
    const { user } = useAuth();

    const history = useHistory();

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setDisabled(true);

        joinPlayerToTeam(user!.uid, teamId, teamPasscodeRequired ? passcode : null)
        .then(() => {
            history.push(`/quiz/${quizId}`);
        })
        .catch((error) => {
            console.error("Could not join team", error);
            setErrorMessage('Something went wrong. Could not join team. Did you get the passcode right?');
            setDisabled(false);
        });
    };
    
    const submitDisabled = teamPasscodeRequired && passcode.trim().length === 0;

    return (
        <form onSubmit={submit}>
            <fieldset disabled={disabled}>
                {teamPasscodeRequired && <>
                    <p>To join this team, enter the team's passcode. You can get this from your captain.</p>
                    <div>
                        <h4 className={formStyles.fieldTitle}><label>Team passcode</label></h4>
                        <input type="text" placeholder="Team passcode" value={passcode} onChange={onPasscodeChange} data-cy="passcode" />
                        <p className={formStyles.fieldDescription}>You need the secret passcode for this team to join. If you're not sure what it is, ask your team captain.</p>
                    </div>
                </>}
                {!teamPasscodeRequired &&
                    <p>To join "{team.name}", just click the button below.</p>
                }
                <PrimaryButton disabled={submitDisabled} data-cy="submit">Join this team</PrimaryButton>
            </fieldset>
            {errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}
        </form>
    );
};