/**
 * @jest-environment node
 */

import firebase from 'firebase';
import firebaseAdmin from 'firebase-admin';
import { initializeTestApp, initializeAdminApp, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';

const testUid = 'uid-of-test-user';
const otherUid = 'uid-of-other-user';

describe('/quiz/{quiz}/questionSecrets security ruleset', () => {
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
            await assertSucceeds(testDb.collection(`/quizzes/${quizId}/questionSecrets`).add({ dummy: 'secret' }));
        });

        it('allows delete', async () => {
            const doc = await adminDb.collection(`/quizzes/${quizId}/questionSecrets`).add({ dummy: 'secret' });
            await assertSucceeds(testDb.doc(doc.path).delete());
        });

        it('allows update', async () => {
            const doc = await adminDb.collection(`/quizzes/${quizId}/questionSecrets`).add({ dummy: 'secret' });
            await assertSucceeds(testDb.doc(doc.path).update({ dummy: 'updated secret' }));
        });

        it('allows fetching', async () => {
            const doc = await adminDb.collection(`/quizzes/${quizId}/questionSecrets`).add({ dummy: 'secret' });
            await assertSucceeds(testDb.doc(doc.path).get());
        });

        it('allows listing', async () => {
            const doc = await adminDb.collection(`/quizzes/${quizId}/questionSecrets`).add({ dummy: 'secret' });
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
            await assertFails(testDb.collection(`/quizzes/${quizId}/questionSecrets`).add({ dummy: 'secret' }));
        });

        it('denies delete', async () => {
            const doc = await adminDb.collection(`/quizzes/${quizId}/questionSecrets`).add({ dummy: 'secret' });
            await assertFails(testDb.doc(doc.path).delete());
        });

        it('denies update', async () => {
            const doc = await adminDb.collection(`/quizzes/${quizId}/questionSecrets`).add({ dummy: 'secret' });
            await assertFails(testDb.doc(doc.path).update({ dummy: 'updated secret' }));
        });

        it('denies fetching', async () => {
            const doc = await adminDb.collection(`/quizzes/${quizId}/questionSecrets`).add({ dummy: 'secret' });
            await assertFails(testDb.doc(doc.path).get());
        });

        it('denies listing', async () => {
            const doc = await adminDb.collection(`/quizzes/${quizId}/questionSecrets`).add({ dummy: 'secret' });
            await assertFails(testDb.collection(doc.parent.path).get());
        });
    });
});