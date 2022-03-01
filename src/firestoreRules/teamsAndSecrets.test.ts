/**
 * @jest-environment node
 */

import firebase from 'firebase';
import firebaseAdmin from 'firebase-admin';
import { initializeTestApp, initializeAdminApp, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';

const testUid = 'uid-of-test-user';
const otherUid = 'uid-of-other-user';
const ownerUid = 'uid-of-quiz-owner';

describe('/teams and /teamSecrets security ruleset', () => {
    let testDb: firebase.firestore.Firestore;
    let adminDb: firebaseAdmin.firestore.Firestore;
    beforeAll(() => {
        testDb = initializeTestApp({
            projectId: process.env.REACT_APP_PID,
            auth: { uid: testUid },
        }).firestore();
        adminDb = initializeAdminApp({ projectId: process.env.REACT_APP_PID }).firestore();
    });

    let quizId: string;
    const quizPasscode = 'open sesame';
    const passcode = 'teamPasscode';
    beforeEach(async () => {
        const quiz = await adminDb.collection('quizzes').add({ ownerId: ownerUid });
        quizId = quiz.id;
        await adminDb.collection('quizSecrets').doc(quizId).set({ passcode: quizPasscode });
    });

    describe('creation', () => {
        it('is allowed when the user makes themselves the team captain', async () => {
            const batch = testDb.batch();
            const team = testDb.collection('teams').doc();
            batch.set(team, { quizId, captainId: testUid, points: 0 });
            const secret = testDb.collection('teamSecrets').doc(team.id);
            batch.set(secret, { quizId, quizPasscode, passcode });
            await assertSucceeds(batch.commit());
        });

        it('is denied when trying to make someone else the team captain', async () => {
            const batch = testDb.batch();
            const team = testDb.collection('teams').doc();
            batch.set(team, { quizId, captainId: otherUid, points: 0 });
            const secret = testDb.collection('teamSecrets').doc(team.id);
            batch.set(secret, { quizId, quizPasscode, passcode });
            await assertFails(batch.commit());
        });

        it('is denied when trying to set the points to non-zero', async () => {
            const batch = testDb.batch();
            const team = testDb.collection('teams').doc();
            batch.set(team, { quizId, captainId: testUid, points: 100 });
            const secret = testDb.collection('teamSecrets').doc(team.id);
            batch.set(secret, { quizId, quizPasscode, passcode });
            await assertFails(batch.commit());
        });

        it('is denied when a team is created without a secret', async () => {
            const batch = testDb.batch();
            const team = testDb.collection('teams').doc();
            batch.set(team, { quizId, captainId: testUid, points: 0 });
            await assertFails(batch.commit());
        });

        it('is denied when a secret is created without a team', async () => {
            const batch = testDb.batch();
            const secret = testDb.collection('teamSecrets').doc();
            batch.set(secret, { quizId, quizPasscode });
            await assertFails(batch.commit());
        });

        it('is denied when a secret is created with the wrong quiz passcode', async () => {
            const batch = testDb.batch();
            const secret = testDb.collection('teamSecrets').doc();
            batch.set(secret, { quizId, quizPasscode: 'incorrect code', passcode });
            await assertFails(batch.commit());
        });

        it('is denied when no team passcode is set', async () => {
            const batch = testDb.batch();
            const team = testDb.collection('teams').doc();
            batch.set(team, { quizId, captainId: testUid, points: 0 });
            const secret = testDb.collection('teamSecrets').doc(team.id);
            batch.set(secret, { quizId, quizPasscode });
            await assertFails(batch.commit());
        });

        it('is allowed without specifying a passcode when the quiz has a null passcode', async () => {
            await adminDb.doc(`quizSecrets/${quizId}`).update({ passcode: null });
            const batch = testDb.batch();
            const team = testDb.collection('teams').doc();
            batch.set(team, { quizId, captainId: testUid, points: 0 });
            const secret = testDb.collection('teamSecrets').doc(team.id);
            batch.set(secret, { quizId, passcode });
            await assertSucceeds(batch.commit());
        });

        it('is allowed when setting a null team passcode', async () => {
            await adminDb.doc(`quizSecrets/${quizId}`).update({ passcode: null });
            const batch = testDb.batch();
            const team = testDb.collection('teams').doc();
            batch.set(team, { quizId, captainId: testUid, points: 0 });
            const secret = testDb.collection('teamSecrets').doc(team.id);
            batch.set(secret, { quizId, passcode: null });
            await assertSucceeds(batch.commit());
        });
    });

    describe('for existing team / secret', () => {
        let teamId: string;
        beforeEach(async () => {
            const team = await adminDb.collection('teams').add({ name: 'team name', captainId: testUid, quizId });
            teamId = team.id;
            await adminDb.collection('teamSecrets').doc(teamId).set({ quizId, passcode: 'team passcode' });
        });

        it('denies deleting, even by the team captain', async () => {
            await assertFails(testDb.doc(`teams/${teamId}`).delete());
            await assertFails(testDb.doc(`teamSecrets/${teamId}`).delete());
        });

        it('allows updating non-critical team properties by the team captain', async () => {
            await assertSucceeds(testDb.doc(`teams/${teamId}`).update({ name: 'updated name' }));
        });

        it('allows updating the secret passcode by the team captain', async () => {
            await assertSucceeds(testDb.doc(`teamSecrets/${teamId}`).update({ passcode: 'new passcode' }));
        });

        it('denies updating points by the team captain', async () => {
            await assertFails(testDb.doc(`teams/${teamId}`).update({ points: 100 }));
        });

        it('denies updating the captaincy by the team captain', async () => {
            await assertFails(testDb.doc(`teams/${teamId}`).update({ captainId: otherUid }));
        });

        it('allows updating points by the quiz owner', async () => {
            await adminDb.doc(`quizzes/${quizId}`).update({ ownerId: testUid });
            await assertSucceeds(testDb.doc(`teams/${teamId}`).update({ points: 100 }));
        });

        it('allows fetching a team (by anyone)', async () => {
            await adminDb.doc(`teams/${teamId}`).update({ captainId: otherUid });
            await assertSucceeds(testDb.doc(`teams/${teamId}`).get());
        });

        it('allows listing teams (by anyone)', async () => {
            await adminDb.doc(`teams/${teamId}`).update({ captainId: otherUid });
            await assertSucceeds(testDb.collection(`teams`).get());
        });

        it('denies fetching a team secret (by anyone)', async () => {
            await assertFails(testDb.doc(`teamSecrets/${teamId}`).get());
        });

        it('denies listing team secrets (by anyone)', async () => {
            await assertFails(testDb.collection('teamSecrets').get());
        });
    });
});