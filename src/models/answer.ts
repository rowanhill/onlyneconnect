import firebase from 'firebase/app';
import 'firebase/firestore';
import { Answer, Four, SimpleAnswer, WallAnswer, WallInProgress } from '.';

/**
 * Submit a simple text answer
 */
export const submitAnswer = (
    quizId: string,
    questionId: string,
    clueId: string,
    teamId: string,
    text: string,
    db: firebase.firestore.Firestore = firebase.app().firestore(),
    serverTimestamp = firebase.firestore.FieldValue.serverTimestamp,
) => {
    const answer: SimpleAnswer = {
        questionId,
        clueId,
        teamId,
        text,
        submittedAt: serverTimestamp() as any,
        type: 'simple',
    };
    return db.collection('quizzes').doc(quizId).collection('answers')
        .add(answer)
        .then((doc) => doc.id);
};

export const submitWallAnswer = (
    quizId: string,
    questionId: string,
    clueId: string,
    teamId: string,
    connections: Four<string>,
    db: firebase.firestore.Firestore = firebase.app().firestore(),
    serverTimestamp = firebase.firestore.FieldValue.serverTimestamp,
) => {
    const answer: WallAnswer = {
        questionId,
        clueId,
        teamId,
        connections: connections.map((text) => ({ text, correct: null })) as WallAnswer['connections'],
        submittedAt: serverTimestamp() as any,
        type: 'wall',
    };
    return db.collection('quizzes').doc(quizId).collection('answers')
        .add(answer)
        .then((doc) => doc.id);
};

export interface AnswerUpdate {
    answerId: string;
    score: number;
    correct?: boolean;
}

/**
 * Mark one or more answers as correct/incorrect and update their scores 
 */
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

/**
 * Update whether one connection answer in a wall answer is correct, and update the wall answer's score 
 */
export const updateWallAnswer = (
    quizId: string,
    answerId: string,
    wallInProgressId: string,
    connectionIndex: number,
    connectionCorrect: boolean,
    db: firebase.firestore.Firestore = firebase.app().firestore(),
    increment = firebase.firestore.FieldValue.increment,
) => {
    return db.runTransaction(async (transaction) => {
        // Read the current version of the answer
        const answerDoc = db.doc(`quizzes/${quizId}/answers/${answerId}`);
        const wipDoc = db.doc(`quizzes/${quizId}/wallInProgress/${wallInProgressId}`);
        const [answerSnapshot, wipSnapshot] = await Promise.all([transaction.get(answerDoc), transaction.get(wipDoc)]);
        const answer = answerSnapshot.data()! as WallAnswer;
        const wallInProgress = wipSnapshot.data()! as WallInProgress;

        if (answer.teamId !== wallInProgress.teamId) {
            throw new Error(`Tried to update a wall answer that did not match wall in progress. Team mismatch: ${answer.teamId} vs ${wallInProgress.teamId}`);
        }
        if (answer.clueId !== wallInProgress.clueId) {
            throw new Error(`Tried to update a wall answer that did not match wall in progress. Clue mismatch: ${answer.clueId} vs ${wallInProgress.clueId}`);
        }
        if (answer.questionId !== wallInProgress.questionId) {
            throw new Error(`Tried to update a wall answer that did not match wall in progress. Question mismatch: ${answer.questionId} vs ${wallInProgress.questionId}`);
        }

        // Calculate new score
        const groupScore = wallInProgress.correctGroups?.length || 0;
        const connectionsCorrect = answer.connections.map((c) => c.correct);
        connectionsCorrect[connectionIndex] = connectionCorrect;
        const connectionsScore = connectionsCorrect.filter((c) => c === true).length;
        const newScore = (groupScore + connectionsScore === 8) ? 10 : groupScore + connectionsScore;

        // Update the answer with the new connection correct mark and new score
        const updateData: Partial<WallAnswer> = {
            connections: answer.connections.map((c, i) => i === connectionIndex ? { ...c, correct: connectionCorrect } : c) as WallAnswer['connections'],
            points: newScore,
        }
        transaction.update(answerDoc, updateData);

        // Update the team's total score with the change in points
        const teamDoc = db.doc(`teams/${answer.teamId}`);
        const pointsDiff = newScore - (answer.points || 0);
        transaction.update(teamDoc, {
            points: increment(pointsDiff), // Atomic increment means we don't need to read old score
        });
        
        return null;
    });
};