/**
 * @jest-environment node
 */

import firebase from 'firebase';
import { initializeTestApp, initializeAdminApp, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';

const testUid = 'uid-of-test-user';
const otherUid = 'uid-of-other-user';
const quizId = 'uid-of-quiz';
const clueId = 'uid-of-clue';
const questionId = 'uid-of-question';

describe('/quiz/{quiz}/wallInProgress/{team} security ruleset', () => {
    let testDb: firebase.firestore.Firestore;
    let adminDb: firebase.firestore.Firestore;
    beforeAll(() => {
        testDb = initializeTestApp({
            projectId: process.env.REACT_APP_PID,
            auth: { uid: testUid },
        }).firestore();
        adminDb = initializeAdminApp({ projectId: process.env.REACT_APP_PID }).firestore();
    });

    beforeEach(async () => {
        await adminDb.doc(`quizzes/${quizId}/questions/${questionId}`).set({ dummy: 'queston' });
        await adminDb.doc(`quizzes/${quizId}/clues/${clueId}`).set({ questionId });
    });

    describe('for team captain', () => {
        let teamId: string;
        beforeEach(async () => {
            const team = await adminDb.collection('teams').add({ captainId: testUid, quizId });
            teamId = team.id;
        });

        it('allows create', async () => {
            await assertSucceeds(testDb.collection(`quizzes/${quizId}/wallInProgress`).add({ teamId, questionId, clueId }));
        });

        it('denies create with correctGroups', async () => {
            await assertFails(testDb.collection(`quizzes/${quizId}/wallInProgress`).add({ teamId, questionId, clueId, correctGroups: [{ indexes: [1, 2, 3, 4] }] }));
        });

        it('denies create with remainingLives', async () => {
            await assertFails(testDb.collection(`quizzes/${quizId}/wallInProgress`).add({ teamId, questionId, clueId, remainingLives: 5 }));
        });

        it('allows update', async () => {
            const path = `quizzes/${quizId}/wallInProgress/`;
            const doc = await adminDb.collection(path).add({ teamId, questionId, clueId });
            await assertSucceeds(testDb.doc(doc.path).update({ updated: true }));
        });

        it('denies update of correctGroups', async () => {
            const path = `quizzes/${quizId}/wallInProgress/`;
            const doc = await adminDb.collection(path).add({ teamId, questionId, clueId });
            await assertFails(testDb.doc(doc.path).update({ correctGroups: [{ indexes: [1, 2, 3, 4] }] }));
        });

        it('denies update of remainingLives', async () => {
            const path = `quizzes/${quizId}/wallInProgress/`;
            const doc = await adminDb.collection(path).add({ teamId, questionId, clueId });
            await assertFails(testDb.doc(doc.path).update({ remainingLives: 5 }));
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
            await assertFails(testDb.collection(`quizzes/${quizId}/wallInProgress`).add({ teamId, questionId, clueId }));
        });

        it('denies update', async () => {
            const path = `quizzes/${quizId}/wallInProgress/`;
            const doc = await adminDb.collection(path).add({ teamId, questionId, clueId });
            await assertFails(testDb.doc(doc.path).update({ updated: true }));
        });

        it('allows fetch', async () => {
            const path = `quizzes/${quizId}/wallInProgress/`;
            const doc = await adminDb.collection(path).add({ teamId, questionId, clueId });
            await assertSucceeds(testDb.doc(doc.path).get());
        });
    });

    describe('for users not in the team', () => {
        let teamId: string;
        beforeEach(() => {
            teamId = 'uid-of-team';
        });

        it('denies create', async () => {
            await assertFails(testDb.collection(`quizzes/${quizId}/wallInProgress`).add({ teamId, questionId, clueId }));
        });

        it('denies update', async () => {
            const path = `quizzes/${quizId}/wallInProgress/`;
            const doc = await adminDb.collection(path).add({ teamId, questionId, clueId });
            await assertFails(testDb.doc(doc.path).update({ updated: true }));
        });

        it('denies fetch', async () => {
            const path = `quizzes/${quizId}/wallInProgress/`;
            const doc = await adminDb.collection(path).add({ teamId, questionId, clueId });
            await assertFails(testDb.doc(doc.path).get());
        });
    });
});