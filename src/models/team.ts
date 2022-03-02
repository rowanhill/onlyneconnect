import firebase from 'firebase/app';
import 'firebase/firestore';
import { Team, TeamSecrets } from '.';

export const createTeam = (
    quizId: string,
    quizPasscode: string|null,
    teamName: string,
    teamPasscode: string|null,
    captainId: string,
    db: firebase.firestore.Firestore = firebase.app().firestore(),
) => {
    const batch = db.batch();
    // Create the secret doc for the team, to prove the quiz passcode is correct
    const newTeamSecretRef = db.collection('teamSecrets').doc();
    batch.set(newTeamSecretRef, {
        quizId,
        quizPasscode: quizPasscode,
        passcode: teamPasscode,
    } as TeamSecrets);
    // Create the public record of the team
    const newTeamRef = db.collection('teams').doc(newTeamSecretRef.id);
    batch.set(newTeamRef, {
        quizId,
        captainId,
        name: teamName,
        points: 0,
        requireTeamPasscode: teamPasscode !== null,
    } as Team);
    // Add the captain as a player on the team
    const playerTeamRef = db.collection('playerTeams').doc(captainId);
    batch.set(playerTeamRef, {
        teamId: newTeamRef.id,
        teamPasscode,
    });
    return batch.commit().then(() => newTeamSecretRef.id);
};

export const joinPlayerToTeam = (
    playerId: string,
    teamId: string,
    teamPasscode: string | null,
    db: firebase.firestore.Firestore = firebase.app().firestore(),
) => {
    return db.doc(`/playerTeams/${playerId}`).set({
        teamId,
        teamPasscode,
    });
};