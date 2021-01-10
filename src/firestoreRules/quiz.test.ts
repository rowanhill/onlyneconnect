/**
 * @jest-environment node
 */

import firebase from 'firebase';
import { initializeTestApp, assertSucceeds, assertFails, initializeAdminApp } from '@firebase/rules-unit-testing';

const testUid = 'uid-of-test-user';
const otherUid = 'uid-of-other-user';

describe('/quizzes security rules', () => {
    let testDb: firebase.firestore.Firestore;
    let anonDb: firebase.firestore.Firestore;
    let adminDb: firebase.firestore.Firestore;
    beforeAll(() => {
        testDb = initializeTestApp({
            projectId: process.env.REACT_APP_PID,
            auth: { uid: testUid },
        }).firestore();
        anonDb = initializeTestApp({ projectId: process.env.REACT_APP_PID, auth: undefined }).firestore();
        adminDb = initializeAdminApp({ projectId: process.env.REACT_APP_PID }).firestore();
    });

    async function createQuiz(ownerId: string) {
        return adminDb.collection('quizzes').add({ ownerId });
    }

    it('can be created by anyone with themselves as owner', async () => {
        await assertSucceeds(testDb.collection('quizzes').add({ ownerId: testUid }));
    });

    it('cannot be created with someone else as the owner', async () => {
        await assertFails(testDb.collection('quizzes').add({ ownerId: otherUid }));
    });

    describe('created by self', () => {
        let quizId: string;
        beforeEach(async () => {
            quizId = (await createQuiz(testUid)).id;
        });

        it('can be fetched', async () => {
            await assertSucceeds(testDb.doc(`/quizzes/${quizId}`).get());
        });

        it('can be listed', async () => {
            await assertSucceeds(testDb.collection('quizzes').get());
        });

        it('can be updated', async () => {
            await assertSucceeds(testDb.doc(`/quizzes/${quizId}`).update({ name: 'updated name' }));
        });

        it('can be deleted', async () => {
            await assertSucceeds(testDb.doc(`/quizzes/${quizId}`).delete());
        });
    });

    describe('created by someone else', () => {
        let quizId: string;
        beforeEach(async () => {
            quizId = (await createQuiz(otherUid)).id;
        });

        it('can be fetched when authenticated', async () => {
            await assertSucceeds(testDb.doc(`/quizzes/${quizId}`).get());
        });

        it('cannot be fetched when not authenticated', async () => {
            await assertFails(anonDb.doc(`/quizzes/${quizId}`).get());
        });

        it('can be listed when authenticated', async () => {
            await assertSucceeds(testDb.collection('quizzes').get());
        });

        it('cannot be listed when not authenticated', async () => {
            await assertFails(anonDb.collection('quizzes').get());
        });

        it('cannot be updated', async () => {
            await assertFails(testDb.doc(`/quizzes/${quizId}`).update({ name: 'updated name' }));
        });

        it('cannot be deleted', async () => {
            await assertFails(testDb.doc(`/quizzes/${quizId}`).delete());
        });
    });
});