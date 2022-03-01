/**
 * @jest-environment node
 */

import firebase from 'firebase';
import { initializeTestApp, initializeAdminApp, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';

const testUid = 'uid-of-test-user';
const otherUid = 'uid-of-other-user';

const teamPasscode = 'team passcode';
const otherPasscode = 'other team passcode';

describe('/playerTeams security ruleset', () => {
    let testDb: firebase.firestore.Firestore;
    let adminDb: firebase.firestore.Firestore;
    beforeAll(() => {
        testDb = initializeTestApp({
            projectId: process.env.REACT_APP_PID,
            auth: { uid: testUid },
        }).firestore();
        adminDb = initializeAdminApp({ projectId: process.env.REACT_APP_PID }).firestore();
    });

    let teamId: string;
    beforeEach(async () => {
        const secret = await adminDb.collection('teamSecrets').add({ passcode: teamPasscode });
        teamId = secret.id;
    });

    it('allows creation for self if team passcode matches', async () => {
        await assertSucceeds(testDb.doc(`playerTeams/${testUid}`).set({ teamId, teamPasscode }));
    });

    it('allows creation for self if no team passcode is provided and team secret passcode is null', async () => {
        await adminDb.doc(`teamSecrets/${teamId}`).update({ passcode: null });
        await assertSucceeds(testDb.doc(`playerTeams/${testUid}`).set({ teamId }));
    });

    it('denies creation for self if team passcode does not match', async () => {
        await assertFails(testDb.doc(`playerTeams/${testUid}`).set({ teamId, teamPasscode: 'wrong code' }));
    });

    it('denies creation for another player (even if team passcode is right)', async () => {
        await assertFails(testDb.doc(`playerTeams/${otherUid}`).set({ teamId, teamPasscode }));
    });

    describe('with existing playerTeams', () => {
        let otherTeamId: string;
        beforeEach(async () => {
            await adminDb.doc(`playerTeams/${testUid}`).set({ teamId, teamPasscode });
            await adminDb.doc(`playerTeams/${otherUid}`).set({ teamId, teamPasscode });
            const secret = await adminDb.collection('teamSecrets').add({ passcode: otherPasscode });
            otherTeamId = secret.id;
        });

        it('allows updating to another team', async () => {
            await assertSucceeds(testDb.doc(`playerTeams/${testUid}`).update({ teamId: otherTeamId, teamPasscode: otherPasscode }));
        });

        it('denies updating someone else to another team', async () => {
            await assertFails(testDb.doc(`playerTeams/${otherUid}`).update({ teamId: otherTeamId, teamPasscode: otherPasscode }));
        });

        it('denies updating to another team if passcode is wrong', async () => {
            await assertFails(testDb.doc(`playerTeams/${testUid}`).update({ teamId: otherTeamId, teamPasscode: 'wrong code' }));
        });

        it('allows deleting self from team', async () => {
            await assertSucceeds(testDb.doc(`playerTeams/${testUid}`).delete());
        });

        it('denies deleting someone else from team', async () => {
            await assertFails(testDb.doc(`playerTeams/${otherUid}`).delete());
        });

        it('allows fetching own record', async () => {
            await assertSucceeds(testDb.doc(`playerTeams/${testUid}`).get());
        });

        it('denies fetching someone else\'s record', async () => {
            await assertFails(testDb.doc(`playerTeams/${otherUid}`).get());
        });
    });
});