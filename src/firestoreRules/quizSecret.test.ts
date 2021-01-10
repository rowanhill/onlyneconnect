/**
 * @jest-environment node
 */

import firebase from 'firebase';
import { initializeTestApp, assertSucceeds, assertFails, initializeAdminApp, firestore } from '@firebase/rules-unit-testing';

const testUid = 'uid-of-test-user';
const otherUid = 'uid-of-other-user';

describe('/quizSecrets security rules', () => {
    let testDb: firebase.firestore.Firestore;
    let adminDb: firebase.firestore.Firestore;
    beforeAll(() => {
        testDb = initializeTestApp({
            projectId: process.env.REACT_APP_PID,
            auth: { uid: testUid },
        }).firestore();
        adminDb = initializeAdminApp({ projectId: process.env.REACT_APP_PID }).firestore();
    });

    async function createQuizWithSecret(ownerId: string) {
        const quiz = await adminDb.collection('quizzes').add({ ownerId });
        await adminDb.doc(`/quizSecrets/${quiz.id}`).set({ passcode: 'one two three' });
        return quiz;
    }

    it('can be created alongside a quiz by anyone with themselves as owner', async () => {
        const batch = testDb.batch();
        const quiz = testDb.collection('quizzes').doc();
        batch.set(quiz, { ownerId: testUid });
        const secret = testDb.collection('quizSecrets').doc(quiz.id);
        batch.set(secret, { passcode: 'one two three' });
        await assertSucceeds(batch.commit());
    });

    it('cannot be created when someone else is the quiz owner', async () => {
        const batch = testDb.batch();
        const quiz = testDb.collection('quizzes').doc();
        batch.set(quiz, { ownerId: otherUid });
        const secret = testDb.collection('quizSecrets').doc(quiz.id);
        batch.set(secret, { passcode: 'one two three' });
        await assertFails(batch.commit());
    });

    describe('created by self', () => {
        let quizId: string;
        beforeEach(async () => {
            quizId = (await createQuizWithSecret(testUid)).id;
        });

        it('can be fetched', async () => {
            await assertSucceeds(testDb.doc(`/quizSecrets/${quizId}`).get());
        });

        it('can be listed', async () => {
            const quizId2 = (await createQuizWithSecret(testUid)).id;
            await assertSucceeds(testDb.collection('quizSecrets')
                .where(firestore.FieldPath.documentId(), 'in', [quizId, quizId2])
                .get());
        });

        it('can be updated', async () => {
            await assertSucceeds(testDb.doc(`/quizSecrets/${quizId}`).update({ passcode: 'updated passcode' }));
        });

        it('can be deleted', async () => {
            await assertSucceeds(testDb.doc(`/quizSecrets/${quizId}`).delete());
        });
    });

    describe('created by someone else', () => {
        let quizId: string;
        beforeEach(async () => {
            quizId = (await createQuizWithSecret(otherUid)).id;
        });

        it('cannot be fetched', async () => {
            await assertFails(testDb.doc(`/quizSecrets/${quizId}`).get());
        });

        it('cannot be listed', async () => {
            await assertFails(testDb.collection('quizSecrets').get());
        });

        it('cannot be updated', async () => {
            await assertFails(testDb.doc(`/quizSecrets/${quizId}`).update({ name: 'updated passcode' }));
        });

        it('cannot be deleted', async () => {
            await assertFails(testDb.doc(`/quizSecrets/${quizId}`).delete());
        });
    });
});