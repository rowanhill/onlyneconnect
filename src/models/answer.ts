import firebase from 'firebase';

export const submitAnswer = (
    quizId: string,
    questionId: string,
    clueId: string,
    teamId: string,
    text: string,
    db: firebase.firestore.Firestore = firebase.app().firestore(),
    serverTimestamp = firebase.firestore.FieldValue.serverTimestamp,
) => {
    return db.collection('quizzes').doc(quizId).collection('answers').add({
        questionId,
        clueId,
        teamId,
        text,
        submittedAt: serverTimestamp(),
    }).then((doc) => doc.id);
};

export const markAnswer = (
    quizId: string,
    answerId: string,
    teamId: string,
    correct: boolean,
    score: number,
    db: firebase.firestore.Firestore = firebase.app().firestore(),
    increment = firebase.firestore.FieldValue.increment,
) => {
    return db.runTransaction(async (transaction) => {
        const answerDoc = db.doc(`quizzes/${quizId}/answers/${answerId}`);
        const freshAnswer = await transaction.get(answerDoc);
        const oldScore = freshAnswer.data()?.points || 0;
        const teamDoc = db.doc(`teams/${teamId}`);
        transaction.update(answerDoc, {
            correct,
            points: score,
        });
        transaction.update(teamDoc, {
            points: increment(score - oldScore),
        });
        return null;
    });
};