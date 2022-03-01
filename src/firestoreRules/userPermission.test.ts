/**
 * @jest-environment node
 */

import firebase from 'firebase';
import firebaseAdmin from 'firebase-admin';
import { initializeTestApp, assertSucceeds, assertFails, initializeAdminApp } from '@firebase/rules-unit-testing';

const testUid = 'uid-of-test-user';
const otherUid = 'uid-of-other-user';

describe('/userPermissions security rules', () => {
    let testDb: firebase.firestore.Firestore;
    let adminDb: firebaseAdmin.firestore.Firestore;
    beforeAll(() => {
        testDb = initializeTestApp({
            projectId: process.env.REACT_APP_PID,
            auth: { uid: testUid },
        }).firestore();
        adminDb = initializeAdminApp({ projectId: process.env.REACT_APP_PID }).firestore();
    });

    async function createUserPermission(ownerId: string) {
        await adminDb.doc(`userPermissions/${ownerId}`).set({ somePermission: true });
    }
 
    it('cannot be created by non-admin', async () => {
        await assertFails(testDb.doc(`userPermissions/${testUid}`).set({ somePermission: true }));
    });

    describe('permission of self', () => {
        beforeEach(async () => {
            await createUserPermission(testUid);
        });
 
        it('can be fetched', async () => {
            await assertSucceeds(testDb.doc(`/userPermissions/${testUid}`).get());
        });

        it('cannot be listed', async () => {
            await assertFails(testDb.collection('userPermissions').get());
        });

        it('cannot be updated', async () => {
            await assertFails(testDb.doc(`/userPermissions/${testUid}`).update({ somePermission: false }));
        });

        it('cannot be deleted', async () => {
            await assertFails(testDb.doc(`/userPermissions/${testUid}`).delete());
        });
    });

    describe('permission of another', () => {
        beforeEach(async () => {
            await createUserPermission(otherUid);
        });
 
        it('cannot be fetched', async () => {
            await assertFails(testDb.doc(`/userPermissions/${otherUid}`).get());
        });

        it('cannot be listed', async () => {
            await assertFails(testDb.collection('userPermissions').get());
        });

        it('cannot be updated', async () => {
            await assertFails(testDb.doc(`/userPermissions/${otherUid}`).update({ somePermission: false }));
        });

        it('cannot be deleted', async () => {
            await assertFails(testDb.doc(`/userPermissions/${otherUid}`).delete());
        });
    });
});