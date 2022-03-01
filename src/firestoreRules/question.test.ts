/**
 * @jest-environment node
 */

import firebase from 'firebase';
import firebaseAdmin from 'firebase-admin';
import { initializeTestApp, initializeAdminApp, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';

const testUid = 'uid-of-test-user';
const otherUid = 'uid-of-other-user';

describe('/quiz/{quiz}/questions security ruleset', () => {
    let testDb: firebase.firestore.Firestore;
    let adminDb: firebaseAdmin.firestore.Firestore;
    beforeAll(() => {
        testDb = initializeTestApp({
            projectId: process.env.REACT_APP_PID,
            auth: { uid: testUid },
        }).firestore();
        adminDb = initializeAdminApp({ projectId: process.env.REACT_APP_PID }).firestore();
    });

    describe('for a quiz owned by the user', () => {
        let quizId: string;
        beforeEach(async () => {
            const quiz = await adminDb.collection('quizzes').add({ ownerId: testUid });
            quizId = quiz.id;
        });

        it('allows create', async () => {
            await assertSucceeds(testDb.collection(`/quizzes/${quizId}/questions`).add({ dummy: 'question' }));
        });

        it('allows delete', async () => {
            const doc = await adminDb.collection(`/quizzes/${quizId}/questions`).add({ dummy: 'question' });
            await assertSucceeds(testDb.doc(doc.path).delete());
        });

        it('allows update', async () => {
            const doc = await adminDb.collection(`/quizzes/${quizId}/questions`).add({ dummy: 'question' });
            await assertSucceeds(testDb.doc(doc.path).update({ dummy: 'updated question' }));
        });

        it('allows fetching even unrevealed questions', async () => {
            const doc = await adminDb.collection(`/quizzes/${quizId}/questions`).add({ isRevealed: false });
            await assertSucceeds(testDb.doc(doc.path).get());
        });

        it('allows listing even unrevealed questions', async () => {
            const doc = await adminDb.collection(`/quizzes/${quizId}/questions`).add({ isRevealed: false });
            await assertSucceeds(testDb.collection(doc.parent.path).get());
        });
    });

    describe('for a quiz owned by someone else', () => {
        let quizId: string;
        beforeEach(async () => {
            const quiz = await adminDb.collection('quizzes').add({ ownerId: otherUid });
            quizId = quiz.id;
        });

        it('denies create', async () => {
            await assertFails(testDb.collection(`/quizzes/${quizId}/questions`).add({ dummy: 'question' }));
        });

        it('denies delete', async () => {
            const doc = await adminDb.collection(`/quizzes/${quizId}/questions`).add({ dummy: 'question' });
            await assertFails(testDb.doc(doc.path).delete());
        });

        it('denies update', async () => {
            const doc = await adminDb.collection(`/quizzes/${quizId}/questions`).add({ dummy: 'question' });
            await assertFails(testDb.doc(doc.path).update({ dummy: 'updated question' }));
        });

        describe('when the user is a player in the quiz', () => {
            beforeEach(async () => {
                const team = await adminDb.collection('teams').add({ quizId });
                await adminDb.collection('playerTeams').doc(testUid).set({ teamId: team.id });
            });

            it('allows fetching revealed questions', async () => {
                const doc = await adminDb.collection(`/quizzes/${quizId}/questions`).add({ isRevealed: true });
                await assertSucceeds(testDb.doc(doc.path).get());
            });

            it('denies fetching unrevealed questions', async () => {
                const doc = await adminDb.collection(`/quizzes/${quizId}/questions`).add({ isRevealed: false });
                await assertFails(testDb.doc(doc.path).get());
            });

            it('allows listing revealed questions', async () => {
                const doc = await adminDb.collection(`/quizzes/${quizId}/questions`).add({ isRevealed: true });
                await adminDb.collection(`/quizzes/${quizId}/questions`).add({ isRevealed: false });
                await assertSucceeds(testDb.collection(doc.parent.path).where('isRevealed', '==', true).get());
            });

            it('denies listing unrevealed questions', async () => {
                const doc = await adminDb.collection(`/quizzes/${quizId}/questions`).add({ isRevealed: true });
                await adminDb.collection(`/quizzes/${quizId}/questions`).add({ isRevealed: false });
                await assertFails(testDb.collection(doc.parent.path).get());
            });
        });

        describe('when the user is not a player in a different quiz', () => {
            beforeEach(async () => {
                const team = await adminDb.collection('teams').add({ quizId: 'some-other-quiz-id' });
                await adminDb.collection('playerTeams').doc(testUid).set({ teamId: team.id });
            });

            it('denies fetching', async () => {
                const doc = await adminDb.collection(`/quizzes/${quizId}/questions`).add({ isRevealed: true });
                await assertFails(testDb.doc(doc.path).get());
            });

            it('denies listing', async () => {
                const doc = await adminDb.collection(`/quizzes/${quizId}/questions`).add({ isRevealed: true });
                await assertFails(testDb.collection(doc.parent.path).get());
            });
        });

        describe('when the user is not a player in a quiz', () => {
            it('denies fetching', async () => {
                const doc = await adminDb.collection(`/quizzes/${quizId}/questions`).add({ isRevealed: true });
                await assertFails(testDb.doc(doc.path).get());
            });

            it('denies listing', async () => {
                const doc = await adminDb.collection(`/quizzes/${quizId}/questions`).add({ isRevealed: true });
                await assertFails(testDb.collection(doc.parent.path).get());
            });
        });
    });
});