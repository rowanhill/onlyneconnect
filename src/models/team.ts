import firebase from 'firebase';

export const createTeam = (
    quizId: string,
    quizPasscode: string,
    teamName: string,
    teamPasscode: string,
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
    });
    // Create the public record of the team
    const newTeamRef = db.collection('teams').doc(newTeamSecretRef.id);
    batch.set(newTeamRef, {
        quizId,
        captainId,
        name: teamName,
        points: 0,
    });
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
    teamPasscode: string,
    db: firebase.firestore.Firestore = firebase.app().firestore(),
) => {
    return db.doc(`/playerTeams/${playerId}`).set({
        teamId,
        teamPasscode,
    });
};