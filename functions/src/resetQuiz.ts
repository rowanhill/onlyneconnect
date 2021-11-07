import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Quiz } from './types';

export const resetQuiz = functions.https.onCall(async (data, context) => {
    // Check inputs are of expected form
    const quizId: string = data.quizId;
    if (typeof quizId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', `Expected quizId to be a string, but found ${quizId}`);
    }

    const db = admin.firestore();
    
    // Reset the quiz, questions and clues to unrevealed
    return await db.runTransaction(async (transaction) => {
        // Fetch the quiz
        const quizDoc = db.doc(`quizzes/${quizId}`);
        const quizSnapshot = await transaction.get(quizDoc);
        if (!quizSnapshot.exists) {
            throw new functions.https.HttpsError('not-found', `Could not find quiz  at ${quizDoc.path}`);
        }
        const quizData = quizSnapshot.data()! as Quiz;
    
        // Check submitting user is owner of the quiz
        if (context.auth?.uid !== quizData.ownerId) {
            throw new functions.https.HttpsError('permission-denied', `Expected auth uid to be to quiz owner (${quizData.ownerId}) but was ${context.auth?.uid}`);
        }

        // Get all quiz questions and clues - to be reset to unrevealed
        const questionsPromise = transaction.get(quizDoc.collection('questions'));
        const cluesPromise = transaction.get(quizDoc.collection('clues'));

        // Get all answers and walls in progress - to be deleted
        const answersPromise = transaction.get(quizDoc.collection('answers'));
        const wallInProgressPromise = transaction.get(quizDoc.collection('wallInProgress'));

        // Get all teams for this quiz - to be deleted
        const teamsPromise = transaction.get(db.collection('teams').where('quizId', '==', quizId));

        // Fetch all above in parallel
        const [questionsSnapshot, cluesSnapshot, answersSnapshot, wallInProgressSnapshot, teamsSnapshot] = await Promise.all([
            questionsPromise, cluesPromise, answersPromise, wallInProgressPromise, teamsPromise,
        ]);

        // Fetch all playerTeams (by id, in chunks of 10, because of 'in' operator limit)
        const chunkedTeamIds = [];
        let chunk = [];
        for (const team of teamsSnapshot.docs) {
            chunk.push(team.id);
            if (chunk.length === 10) {
                chunkedTeamIds.push(chunk);
                chunk = [];
            }
        }
        if (chunk.length > 0) {
            chunkedTeamIds.push(chunk);
        }
        const playerTeamsPromises = chunkedTeamIds.map((ids) => transaction.get(db.collection('playerTeams').where('teamId', 'in', ids)));
        const playerTeamsSnapshotChunks = await Promise.all(playerTeamsPromises);

        // Reset the quiz, questions and clues
        transaction.update(quizDoc, { currentQuestionId: null, isComplete: false } as Partial<Quiz>);
        for (const question of questionsSnapshot.docs) {
            transaction.update(question.ref, {
                isRevealed: false,
                connection: admin.firestore.FieldValue.delete(),
                connections: admin.firestore.FieldValue.delete(),
                exampleLastInSequence: admin.firestore.FieldValue.delete(),
            });
        }
        for (const clue of cluesSnapshot.docs) {
            transaction.update(clue.ref, {
                isRevealed: false,
                revealedAt: admin.firestore.FieldValue.delete(),
                closedAt: admin.firestore.FieldValue.delete(),
                solution: admin.firestore.FieldValue.delete(),
            });
        }

        // Delete the answers and walls in progress
        for (const answer of answersSnapshot.docs) {
            transaction.delete(answer.ref);
        }
        for (const wip of wallInProgressSnapshot.docs) {
            transaction.delete(wip.ref);
        }

        // Delete teams, team secrets and player teams
        for (const team of teamsSnapshot.docs) {
            transaction.delete(team.ref);
            transaction.delete(db.doc(`teamSecrets/${team.id}`));
        }
        for (const playerTeamsSnapshot of playerTeamsSnapshotChunks) {
            for (const playerTeam of playerTeamsSnapshot.docs) {
                transaction.delete(playerTeam.ref);
            }
        }

        return quizId;
    });
});