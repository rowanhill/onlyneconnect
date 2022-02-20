import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { KJUR } from 'jsrsasign';
import { Quiz, UserPermissions } from './types';

export const generateZoomToken = functions.https.onCall(async (data, context) => {
    // Check inputs are of expected form
    const topic = data.topic;
    if (typeof topic !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', `Expected topic to be a string, but found ${topic}`);
    }
    const quizId = data.quizId;
    if (typeof quizId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', `Expected quizId to be a string, but found ${quizId}`);
    }

    // Check the Zoom Video SDK credentials have been set in Firebase function config
    const zoomSdkKey = functions.config().zoom?.videoSdkKey;
    const zoomSdkSecret = functions.config().zoom?.videoSdkSecret;
    if (typeof zoomSdkKey !== 'string' || typeof zoomSdkSecret !== 'string') {
        throw new functions.https.HttpsError('internal', 'Zoom SDK credentials are not configured. Configure them using `firebase functions:config:set zoom.videoSdkKey="THE API KEY" zoom.videoSdkSecret="THE API SECRET"` then redeploy.')
    }

    const quizDoc = admin.firestore().doc(`quizzes/${quizId}`);
    const quizSnapshot = await quizDoc.get();
    if (!quizSnapshot.exists) {
        throw new functions.https.HttpsError('not-found', `Could not find quiz  at ${quizDoc.path}`);
    }

    const quizData = quizSnapshot.data()! as Quiz;
    
    // Check the quiz has / will have a Zoom session
    if (!quizData.isZoomEnabled) {
        throw new functions.https.HttpsError('permission-denied', 'This quiz does not support Zoom sessions');
    }

    // Check the quiz owner already started the session OR the calling user owns the quiz and has permission to create sessions
    if (quizData.ownerZoomId !== null) {
        const userCanCreateZoomSession = async () => {
            if (quizData.ownerZoomId !== null) {
                return true;
            }
            if (!context.auth?.uid) {
                return false;
            }
            if (context.auth.uid !== quizData.ownerId) {
                return false;
            }
            const userPermissionsDoc = admin.firestore().doc(`userPermissions/${context.auth.uid}`);
            const userPermissionsSnapshot = await userPermissionsDoc.get();
            if (!userPermissionsSnapshot.exists) {
                return false;
            }
            const userPermissionsData = userPermissionsSnapshot.data() as UserPermissions;
            return userPermissionsData.canCreateZoomSessions;
        };
        const canCreate = await userCanCreateZoomSession();
        if (!canCreate) {
            throw new functions.https.HttpsError('permission-denied', `Expected zoom session to be live (owner zoom ID is ${quizData.ownerZoomId}) or auth uid to be to quiz owner (${quizData.ownerId}) but was ${context.auth?.uid}`);
        }
    }

    // Header
    const header = { alg: 'HS256', typ: 'JWT' };
    
    // Payload
    const iat = Math.round(new Date().getTime() / 1000);
    const exp = iat + 60 * 60 * 2;
    const payload = {
        app_key: zoomSdkKey,
        iat,
        exp,
        tpc: topic,
        user_identity: context.auth?.uid,
        session_key: quizId,
    };

    // JSONify
    const headerJson = JSON.stringify(header);
    const payloadJson = JSON.stringify(payload);

    // Create signed JWT
    return KJUR.jws.JWS.sign('HS256', headerJson, payloadJson, zoomSdkSecret);
});