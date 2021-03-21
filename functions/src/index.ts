import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp();

// Hack: copied from src/models/index.ts!
interface Quiz {
    name: string;
    ownerId: string;
    questionIds: string[];
    currentQuestionId: string | null;
    isComplete: boolean;
    youTubeVideoId: string | null;
}
type Four<T> = [T, T, T, T];
interface WallSecrets {
    type: 'wall';
    solution: Four<{ texts: Four<string>; connection: string; }>;
}
interface WallInProgress {
    // static properties
    questionId: string;
    clueId: string;
    teamId: string;

    // dynamic properties
    selectedTexts: string[];

    // Sensitive properties, written to by cloud functions
    correctGroups?: { texts: Four<string>; solutionGroupIndex: number; }[];
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
    const wipId = data.wipId;
    if (typeof wipId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', `Expected wipId to be a string, but found ${wipId}`);
    }
    const textsAsAny = data.texts;
    if (!Array.isArray(textsAsAny)) {
        throw new functions.https.HttpsError('invalid-argument', `Expected texts to be an array, but found ${textsAsAny}`);
    }
    if (textsAsAny.length !== 4) {
        throw new functions.https.HttpsError('invalid-argument', `Expected texts to have 4 elements, but found ${textsAsAny.length}`);
    }
    for (let i = 0; i < textsAsAny.length; i++) {
        const elementAtI = textsAsAny[i];
        if (typeof elementAtI !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', `Expected all elements of texts to be strings, but element at ${i} is ${typeof elementAtI}`);
        }
    }
    const texts = textsAsAny as Four<string>;

    // Start a transaction - we update the wall progress based on it's current state, so need to read and write atomically
    return await admin.firestore().runTransaction(async (transaction) => {
        // Read clue+secrets & team's progress from database
        const progressDoc = admin.firestore().doc(`quizzes/${quizId}/wallInProgress/${wipId}`);
        const progressSnapshot = await transaction.get(progressDoc);
        if (!progressSnapshot.exists) {
            throw new functions.https.HttpsError('not-found', `Could not find wall in progress data at ${progressSnapshot.ref.path}`);
        }
        const progressData = progressSnapshot.data()! as WallInProgress;

        const teamPromise = transaction.get(admin.firestore().doc(`teams/${progressData.teamId}`));
        const secretPromise = transaction.get(admin.firestore().doc(`quizzes/${quizId}/questionSecrets/${progressData.questionId}`));
        const [teamSnapshot, secretSnapshot] = await Promise.all([teamPromise, secretPromise]);

        if (!teamSnapshot.exists) {
            throw new functions.https.HttpsError('not-found', `Could not find clue at ${teamSnapshot.ref.path}`);
        }
        const teamData = teamSnapshot.data()! as Team;

        // Check submitting user is captain of team submitted for
        if (context.auth?.uid !== teamData.captainId) {
            throw new functions.https.HttpsError('permission-denied', `Expected auth uid to be to team captain (${teamData.captainId}) but was ${context.auth?.uid}`);
        }
        
        if (!secretSnapshot.exists) {
            throw new functions.https.HttpsError('not-found', `Could not find question secrets at ${secretSnapshot.ref.path}`);
        }
        const secretData = secretSnapshot.data()! as WallSecrets;

        const remainingLiveSet = typeof progressData.remainingLives === 'number';
        if (remainingLiveSet && progressData.remainingLives! <= 0) {
            throw new functions.https.HttpsError('failed-precondition', 'No lives remaining');
        }

        // Determine if the submitted group matches a solution group
        const sortedSubmittedTexts = texts.slice().sort();
        const submissionSolutionGroupIndex = secretData.solution.findIndex((solutionGroup) => {
            const sortedSolutionTexts = solutionGroup.texts.slice().sort();
            return scalarArraysAreEqual(sortedSolutionTexts, sortedSubmittedTexts);
        });

        // Submitted group is correct if it matches a solution group not submitted before
        const correctGroups = progressData.correctGroups || [];
        const submissionIsCorrect = submissionSolutionGroupIndex > -1 &&
            !correctGroups.some((group) => group.solutionGroupIndex === submissionSolutionGroupIndex);
    
        // Clear the selection regardless of result
        const updateData: Partial<WallInProgress> = {
            selectedTexts: [],
        };
        // Update the correct groups / lives as appropriate
        if (submissionIsCorrect) {
            const numCorrectAfterUpdate = (progressData.correctGroups?.length || 0) + 1;

            // Add the submitted indexes to the correctGroups
            const groupsToAdd = [{ texts, solutionGroupIndex: submissionSolutionGroupIndex }];

            // If three groups have now been found, the fourth is automatically found
            if (numCorrectAfterUpdate === secretData.solution.length - 1) {
                const unfoundGroupIndexes = new Set(secretData.solution.keys());
                for (const foundGroup of progressData.correctGroups!) {
                    unfoundGroupIndexes.delete(foundGroup.solutionGroupIndex);
                }
                unfoundGroupIndexes.delete(submissionSolutionGroupIndex);
                if (unfoundGroupIndexes.size !== 1) {
                    console.error('Could not identify final group (after user has found all others). The following indexes remain:', unfoundGroupIndexes);
                } else {
                    const finalGroupIndex = unfoundGroupIndexes.values().next().value as number;
                    const finalGroup = secretData.solution[finalGroupIndex];
                    groupsToAdd.push({ texts: finalGroup.texts, solutionGroupIndex: finalGroupIndex });
                }
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