import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp();

// Hack: copied from src/models/index.ts!
type Four<T> = [T, T, T, T];
type Sixteen<T> = [
    T, T, T, T,
    T, T, T, T,
    T, T, T, T,
    T, T, T, T,
];
interface FourByFourTextClue {
    type: 'four-by-four-text';
    questionId: string;
    isRevealed: boolean;
    texts: Sixteen<string>;
    answerLimit: null;
    revealedAt?: admin.firestore.Timestamp;
    closedAt?: admin.firestore.Timestamp;
}
interface FourByFourTextClueSecrets {
    solution: Four<{ texts: Four<string>; }>;
    type: 'four-by-four-text';
}
interface WallInProgress {
    selectedIndexes: number[];
    correctGroups?: { indexes: number[]; }[];
    remainingLives?: number;
}
interface Team {
    name: string;
    quizId: string;
    points: number;
    captainId: string;
}

export const checkIfWallGroupIsInSolution = functions.https.onCall(async (data, context) => {
    // Check inputs are of expected form
    const quizId = data.quizId;
    if (typeof quizId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', `Expected quizId to be a string, but found ${quizId}`);
    }
    const clueId = data.clueId;
    if (typeof clueId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', `Expected clueId to be a string, but found ${clueId}`);
    }
    const teamId = data.teamId;
    if (typeof teamId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', `Expected teamId to be a string, but found ${teamId}`);
    }
    const indexesAsAny = data.indexes;
    if (!Array.isArray(indexesAsAny)) {
        throw new functions.https.HttpsError('invalid-argument', `Expected indexes to be an array, but found ${indexesAsAny}`);
    }
    if (indexesAsAny.length !== 4) {
        throw new functions.https.HttpsError('invalid-argument', `Expected indexes to have 4 elements, but found ${indexesAsAny.length}`);
    }
    for (let i = 0; i < indexesAsAny.length; i++) {
        const indexAtI = indexesAsAny[i];
        if (typeof indexAtI !== 'number') {
            throw new functions.https.HttpsError('invalid-argument', `Expected all elements of indexes to be numbers, but element at ${i} is ${typeof indexAtI}`);
        }
    }
    const indexes = indexesAsAny as [number, number, number, number];

    // Check submitting user is captain of team submitted for
    const teamSnapshot = await admin.firestore().doc(`teams/${teamId}`).get();
    if (!teamSnapshot.exists) {
        throw new functions.https.HttpsError('not-found', `Could not find clue at ${teamSnapshot.ref.path}`);
    }
    const teamData = teamSnapshot.data()! as Team;
    if (context.auth?.uid !== teamData.captainId) {
        throw new functions.https.HttpsError('permission-denied', `Expected auth uid to be to team captain (${teamData.captainId}) but was ${context.auth?.uid}`);
    }

    // Start a transaction - we update the wall progress based on it's current state, so need to read and write atomically
    return await admin.firestore().runTransaction(async (transaction) => {
        // Read clue+secrets & team's progress from database
        const progressDoc = admin.firestore().doc(`quizzes/${quizId}/clues/${clueId}/wallInProgress/${teamId}`);
        const cluePromise = transaction.get(admin.firestore().doc(`quizzes/${quizId}/clues/${clueId}`));
        const secretPromise = transaction.get(admin.firestore().doc(`quizzes/${quizId}/clueSecrets/${clueId}`));
        const progressPromise = transaction.get(progressDoc);
        const [clueSnapshot, secretSnapshot, progressSnapshot] = await Promise.all([cluePromise, secretPromise, progressPromise]);
        if (!secretSnapshot.exists) {
            throw new functions.https.HttpsError('not-found', `Could not find clue at ${clueSnapshot.ref.path}`);
        }
        if (!secretSnapshot.exists) {
            throw new functions.https.HttpsError('not-found', `Could not find clue secrets at ${secretSnapshot.ref.path}`);
        }
        if (!progressSnapshot.exists) {
            throw new functions.https.HttpsError('not-found', `Could not find wall in progress data at ${progressSnapshot.ref.path}`);
        }
        const clueData = clueSnapshot.data()! as FourByFourTextClue;
        const secretData = secretSnapshot.data()! as FourByFourTextClueSecrets;
        const progressData = progressSnapshot.data()! as WallInProgress;

        const remainingLiveSet = typeof progressData.remainingLives === 'number';
        if (remainingLiveSet && progressData.remainingLives! <= 0) {
            throw new functions.https.HttpsError('failed-precondition', 'No lives remaining');
        }

        // Determine if the submitted group is correct
        const sortedSubmittedTexts = indexes.map((i) => clueData.texts[i]).sort();
        const submissionIsCorrect = secretData.solution.some((solutionGroup) => {
            const sortedSolutionTexts = solutionGroup.texts.slice().sort();
            return scalarArraysAreEqual(sortedSolutionTexts, sortedSubmittedTexts);
        });

        // Ensure submitted group does not re-use any texts
        const remainingTextIndexes = new Set<number>();
        for (let i = 0; i < 16; i++) {
            remainingTextIndexes.add(i);
        }
        for (const group of (progressData.correctGroups || [])) {
            for (const i of group.indexes) {
                remainingTextIndexes.delete(i);
            }
        }
        for (const i of indexes) {
            const indexRemained = remainingTextIndexes.delete(i);
            if (!indexRemained) {
                throw new  functions.https.HttpsError('invalid-argument', `Cannot re-use text indexes, but ${i} appears in a previously accepted group`);
            }
        }
    
        // Clear the selection regardless of result
        const updateData: Partial<WallInProgress> = {
            selectedIndexes: [],
        };
        // Update the correct groups / lives as appropriate
        if (submissionIsCorrect) {
            const numCorrectAfterUpdate = (progressData.correctGroups?.length || 0) + 1;

            // Add the submitted indexes to the correctGroups
            const groupsToAdd = [{ indexes }];

            // If three groups have now been found, the fourth is automatically found
            if (numCorrectAfterUpdate === 3) {
                const finalGroup = Array.from(remainingTextIndexes.values());
                groupsToAdd.push({ indexes: finalGroup as Four<number> });
            }

            // Append the new correct groups
            updateData.correctGroups = admin.firestore.FieldValue.arrayUnion(...groupsToAdd) as any;
            
            // If this correct answer takes the number of found groups to 2 (or more, somehow), set
            // the number of lives remaining to 3.
            if (numCorrectAfterUpdate >= 2 && !remainingLiveSet) {
                updateData.remainingLives = 3;
            }
        } else {
            // If a wrong answer was given after the remaining lives mechanism has kicked in, then
            // reduce the number of remaining lives
            if (remainingLiveSet) {
                updateData.remainingLives = admin.firestore.FieldValue.increment(-1) as any;
            }
        }

        transaction.update(progressDoc, updateData);
        return submissionIsCorrect;
    });
});

function scalarArraysAreEqual(array1: any[], array2: any[]): boolean {
    return array1.length === array2.length && array1.every((value, index) => value === array2[index]);
}