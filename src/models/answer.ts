import firebase from 'firebase/app';
import 'firebase/firestore';
import { Answer } from '.';

export const submitAnswer = (
    quizId: string,
    questionId: string,
    clueId: string,
    teamId: string,
    text: string,
    db: firebase.firestore.Firestore = firebase.app().firestore(),
    serverTimestamp = firebase.firestore.FieldValue.serverTimestamp,
) => {
    return db.collection('quizzes').doc(quizId).collection('answers').add({
        questionId,
        clueId,
        teamId,
        text,
        submittedAt: serverTimestamp(),
    }).then((doc) => doc.id);
};

export interface AnswerUpdate {
    answerId: string;
    score: number;
    correct?: boolean;
}

export const updateAnswers = (
    quizId: string,
    answerUpdates: AnswerUpdate[],
    db: firebase.firestore.Firestore = firebase.app().firestore(),
    increment = firebase.firestore.FieldValue.increment,
) => {
    return db.runTransaction(async (transaction) => {
        // Read the current version of the answers
        const updatedAnswerDocs = answerUpdates.map((update) => db.doc(`quizzes/${quizId}/answers/${update.answerId}`));
        const freshAnswerRequests = updatedAnswerDocs.map((doc) => transaction.get(doc));
        const freshAnswers = await Promise.all(freshAnswerRequests);

        // Update the answers, and calculate the aggregate team difference
        const scoreDiffByTeamId: { [teamId: string]: number; } = {};
        let i = 0;
        for (const freshAnswer of freshAnswers) {
            const answerUpdate = answerUpdates[i];
            const answerDoc = updatedAnswerDocs[i];
            const freshAnswerData = freshAnswer.data() as Answer;

            // Calculate the change in score for this answer
            const oldScore = freshAnswerData.points || 0;
            const diff = answerUpdate.score - oldScore;

            // Add this change to the running total for this team
            scoreDiffByTeamId[freshAnswerData.teamId] = (scoreDiffByTeamId[freshAnswerData.teamId] || 0) + diff;

            // Update the answer
            const updateData: { points: number; correct?: boolean; } = { points: answerUpdate.score };
            if (answerUpdate.correct !== undefined) {
                updateData.correct = answerUpdate.correct;
            }
            transaction.update(answerDoc, updateData);

            i++;
        }

        // Update the team scores with the aggregate diffs.
        for (const teamId of Object.keys(scoreDiffByTeamId)) {
            const teamDoc = db.doc(`teams/${teamId}`);
            const teamDiff = scoreDiffByTeamId[teamId];
            transaction.update(teamDoc, {
                points: increment(teamDiff), // Atomic increment means we don't need to read old score
            });
        }
        
        return null;
    });
};