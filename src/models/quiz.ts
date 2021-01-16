import firebase from 'firebase';

export const createQuiz = (
    quizName: string,
    passcode: string,
    ownerId: string,
    db: firebase.firestore.Firestore = firebase.app().firestore(),
) => {
    const batch = db.batch();
    const secretsDoc = db.collection('quizSecrets').doc();
    batch.set(secretsDoc, { passcode });
    const quizDoc = db.doc(`quizzes/${secretsDoc.id}`);
    batch.set(quizDoc, { name: quizName, ownerId, questionIds: [], currentQuestionId: null });
    return batch.commit().then(() => secretsDoc.id);
};