/**
 * @jest-environment node
 */

import firebase from 'firebase';
import { initializeTestApp, initializeAdminApp, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';

const testUid = 'uid-of-test-user';
const otherUid = 'uid-of-other-user';
const quizId = 'uid-of-quiz';
const clueId = 'uid-of-clue';

describe('/quiz/{quiz}/clues/{clue}/wallInProgress/{team} security ruleset', () => {
    let testDb: firebase.firestore.Firestore;
    let adminDb: firebase.firestore.Firestore;
    beforeAll(() => {
        testDb = initializeTestApp({
            projectId: process.env.REACT_APP_PID,
            auth: { uid: testUid },
        }).firestore();
        adminDb = initializeAdminApp({ projectId: process.env.REACT_APP_PID }).firestore();
    });

    describe('for team captain', () => {
        let teamId: string;
        beforeEach(async () => {
            const team = await adminDb.collection('teams').add({ captainId: testUid, quizId });
            teamId = team.id;
        });

        it('allows create', async () => {
            await assertSucceeds(testDb.doc(`quizzes/${quizId}/clues/${clueId}/wallInProgress/${teamId}`).set({ dummy: true }));
        });

        it('denies create with correctGroups', async () => {
            await assertFails(testDb.doc(`quizzes/${quizId}/clues/${clueId}/wallInProgress/${teamId}`).set({ correctGroups: [{ indexes: [1, 2, 3, 4] }] }));
        });

        it('denies create with remainingLives', async () => {
            await assertFails(testDb.doc(`quizzes/${quizId}/clues/${clueId}/wallInProgress/${teamId}`).set({ remainingLives: 5 }));
        });

        it('allows update', async () => {
            const path = `quizzes/${quizId}/clues/${clueId}/wallInProgress/${teamId}`
            await adminDb.doc(path).set({ dummy: true });
            await assertSucceeds(testDb.doc(path).update({ updated: true }));
        });

        it('denies update of correctGroups', async () => {
            const path = `quizzes/${quizId}/clues/${clueId}/wallInProgress/${teamId}`
            await adminDb.doc(path).set({ dummy: true });
            await assertFails(testDb.doc(path).update({ correctGroups: [{ indexes: [1, 2, 3, 4] }] }));
        });

        it('denies update of remainingLives', async () => {
            const path = `quizzes/${quizId}/clues/${clueId}/wallInProgress/${teamId}`
            await adminDb.doc(path).set({ dummy: true });
            await assertFails(testDb.doc(path).update({ remainingLives: 5 }));
        });
    });

    describe('for team members', () => {
        let teamId: string;
        beforeEach(async () => {
            const team = await adminDb.collection('teams').add({ captainId: otherUid, quizId });
            await adminDb.collection('playerTeams').doc(testUid).set({ teamId: team.id });
            teamId = team.id;
        });

        it('denies create', async () => {
            await assertFails(testDb.doc(`quizzes/${quizId}/clues/${clueId}/wallInProgress/${teamId}`).set({ dummy: true }));
        });

        it('denies update', async () => {
            const path = `quizzes/${quizId}/clues/${clueId}/wallInProgress/${teamId}`
            await adminDb.doc(path).set({ dummy: true });
            await assertFails(testDb.doc(path).update({ updated: true }));
        });

        it('allows fetch', async () => {
            const path = `quizzes/${quizId}/clues/${clueId}/wallInProgress/${teamId}`
            await adminDb.doc(path).set({ dummy: true });
            await assertSucceeds(testDb.doc(path).get());
        });
    });

    describe('for users not in the team', () => {
        let teamId: string;
        beforeEach(() => {
            teamId = 'uid-of-team';
        });

        it('denies create', async () => {
            await assertFails(testDb.doc(`quizzes/${quizId}/clues/${clueId}/wallInProgress/${teamId}`).set({ dummy: true }));
        });

        it('denies update', async () => {
            const path = `quizzes/${quizId}/clues/${clueId}/wallInProgress/${teamId}`
            await adminDb.doc(path).set({ dummy: true });
            await assertFails(testDb.doc(path).update({ updated: true }));
        });

        it('denies fetch', async () => {
            const path = `quizzes/${quizId}/clues/${clueId}/wallInProgress/${teamId}`
            await adminDb.doc(path).set({ dummy: true });
            await assertFails(testDb.doc(path).get());
        });
    });
});