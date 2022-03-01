/**
 * @jest-environment node
 */

import firebase from 'firebase';
import { initializeTestApp, initializeAdminApp, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import firebaseAdmin from 'firebase-admin';

const testUid = 'uid-of-test-user';
const otherUid = 'uid-of-other-user';
const ownerUid = 'uid-of-quiz-owner';

describe('/quiz/{quiz}/answers security ruleset', () => {
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
    let questionId: string;
    let clueId: string;
    beforeEach(async () => {
        const quiz = await adminDb.collection('quizzes').add({ ownerId: ownerUid });
        const question = await quiz.collection('questions').add({ isRevealed: true });
        const clue = await quiz.collection('clues').add({ isRevealed: true, questionId: question.id });
        quizId = quiz.id;
        questionId = question.id;
        clueId = clue.id;
    });

    describe('for team captain', () => {
        let teamId: string;
        beforeEach(async () => {
            const team = await adminDb.collection('teams').add({ captainId: testUid, quizId });
            teamId = team.id;
        });

        describe('create', () => {
            it('is allowed', async () => {
                await assertSucceeds(
                    testDb.collection(`/quizzes/${quizId}/answers`)
                        .add({ questionId, clueId, teamId, submittedAt: firebase.firestore.FieldValue.serverTimestamp() })
                );
            });
    
            it('is denied if question is not revealed', async () => {
                await adminDb.doc(`quizzes/${quizId}/questions/${questionId}`).update({ isRevealed: false });
                await assertFails(
                    testDb.collection(`/quizzes/${quizId}/answers`)
                        .add({ questionId, clueId, teamId, submittedAt: firebase.firestore.FieldValue.serverTimestamp() })
                );
            });
    
            it('is denied if clue is not revealed', async () => {
                await adminDb.doc(`quizzes/${quizId}/clues/${clueId}`).update({ isRevealed: false });
                await assertFails(
                    testDb.collection(`/quizzes/${quizId}/answers`)
                        .add({ questionId, clueId, teamId, submittedAt: firebase.firestore.FieldValue.serverTimestamp() })
                );
            });
    
            it('is denied if referenced clue does not belong to referenced answer', async () => {
                const otherClue = await adminDb.collection(`quizzes/${quizId}/clues`)
                    .add({ isRevealed: true, questionId: 'some-other-question-id' });
                await assertFails(
                    testDb.collection(`/quizzes/${quizId}/answers`)
                        .add({ questionId, clueId: otherClue.id, teamId, submittedAt: firebase.firestore.FieldValue.serverTimestamp() })
                );
            });
    
            it('is denied if user attempts to set points', async () => {
                await assertFails(
                    testDb.collection(`/quizzes/${quizId}/answers`)
                        .add({ questionId, clueId, teamId, submittedAt: firebase.firestore.FieldValue.serverTimestamp(), points: 100 })
                );
            });
    
            it('is denied if user attempts to mark answer correct', async () => {
                await assertFails(
                    testDb.collection(`/quizzes/${quizId}/answers`)
                        .add({ questionId, clueId, teamId, submittedAt: firebase.firestore.FieldValue.serverTimestamp(), correct: true })
                );
            });
    
            it('is denied if user attempts to set custom submittedAt', async () => {
                await assertFails(
                    testDb.collection(`/quizzes/${quizId}/answers`)
                        .add({ questionId, clueId, teamId, submittedAt: firebase.firestore.Timestamp.now() })
                );
            });
    
            it('is denied if user attempts to submit for another team', async () => {
                const otherTeam = await adminDb.collection('teams').add({ captainId: otherUid, quizId });
                await assertFails(
                    testDb.collection(`/quizzes/${quizId}/answers`)
                        .add({ questionId, clueId, teamId: otherTeam.id, submittedAt: firebase.firestore.FieldValue.serverTimestamp() })
                );
            });
        });

        describe('with an existing answer', () => {
            let answer: firebaseAdmin.firestore.DocumentReference;
            beforeEach(async () => {
                answer = await adminDb.collection(`/quizzes/${quizId}/answers`).add({
                    questionId,
                    clueId,
                    teamId,
                    submittedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
                    text: 'foo',
                });
            });

            it('denies update', async () => {
                assertFails(testDb.doc(answer.path).update({ text: 'bar' }));
            });

            it('denies fetching if in bad state where team captain is not also a team member', async () => {
                assertFails(testDb.doc(answer.path).get());
            });

            it('denies listing if in bad state where team captain is not also a team member', async () => {
                assertFails(testDb.collection(answer.parent.path).where('teamId', '==', teamId).get());
            });
        });
    });

    describe('for team member', () => {
        let teamId: string;
        beforeEach(async () => {
            const team = await adminDb.collection('teams').add({ captainId: otherUid, quizId });
            await adminDb.collection('playerTeams').doc(testUid).set({ teamId: team.id });
            teamId = team.id;
        });

        it('denies create', async () => {
            await assertFails(
                testDb.collection(`/quizzes/${quizId}/answers`)
                    .add({ questionId, clueId, teamId, submittedAt: firebase.firestore.FieldValue.serverTimestamp() })
            );
        });

        describe('with are existing answers', () => {
            let answer: firebaseAdmin.firestore.DocumentReference;
            let otherAnswer: firebaseAdmin.firestore.DocumentReference;
            beforeEach(async () => {
                answer = await adminDb.collection(`/quizzes/${quizId}/answers`).add({
                    questionId,
                    clueId,
                    teamId,
                    submittedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
                    text: 'foo',
                });
                otherAnswer = await adminDb.collection(`/quizzes/${quizId}/answers`).add({
                    questionId,
                    clueId,
                    teamId: 'some-other-team-id',
                    submittedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
                    text: 'foo',
                });
            });

            it('denies update', async () => {
                await assertFails(testDb.doc(answer.path).update({ text: 'bar' }));
            });
            
            it('allows fetching own team\'s answer', async () => {
                await assertSucceeds(testDb.doc(answer.path).get());
            });
            
            it('denies fetching another team\'s answer', async () => {
                await assertFails(testDb.doc(otherAnswer.path).get());
            });

            it('allows listing own team\'s answers', async () => {
                await assertSucceeds(testDb.collection(answer.parent.path).where('teamId', '==', teamId).get())
            });

            it('denies listing other team\'s answers', async () => {
                await assertFails(testDb.collection(answer.parent.path).get())
            });
        });
    });

    describe('for quiz owner', () => {
        let answer: firebaseAdmin.firestore.DocumentReference;
        beforeEach(async () => {
            await adminDb.doc(`quizzes/${quizId}`).update({ ownerId: testUid });

            answer = await adminDb.collection(`/quizzes/${quizId}/answers`).add({
                questionId,
                clueId,
                teamId: 'any-team-id',
                submittedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
                text: 'foo',
            });
        });

        it('allows fetching', async () => {
            await assertSucceeds(testDb.doc(answer.path).get());
        });

        it('allows listing', async () => {
            await assertSucceeds(testDb.collection(answer.parent.path).get());
        });

        it('allows updating points and correct', async () => {
            await assertSucceeds(testDb.doc(answer.path).update({ points: 3, correct: true }));
        });

        it('denies updating anything else', async () => {
            await assertFails(testDb.doc(answer.path).update({ text: 'bar' }));
        });
    });
});