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

export interface ClueSpec {
    id?: string;
    text: string;
    answerLimit: number | null;
}

export interface ConnectionQuestionSpec {
    id?: string;
    answerLimit: number | null;
    clues: [ClueSpec, ClueSpec, ClueSpec, ClueSpec];
}

export const createConnectionQuestion = (
    quizId: string,
    question: ConnectionQuestionSpec,
    db: firebase.firestore.Firestore = firebase.app().firestore(),
    arrayUnion = firebase.firestore.FieldValue.arrayUnion,
) => {
    const batch = db.batch();

    const quizDoc = db.doc(`quizzes/${quizId}`);
    const clue1Doc = db.collection(`quizzes/${quizId}/clues`).doc();
    const clue2Doc = db.collection(`quizzes/${quizId}/clues`).doc();
    const clue3Doc = db.collection(`quizzes/${quizId}/clues`).doc();
    const clue4Doc = db.collection(`quizzes/${quizId}/clues`).doc();
    const questionDoc = db.collection(`quizzes/${quizId}/questions`).doc();

    const clueIds = [clue1Doc.id, clue2Doc.id, clue3Doc.id, clue4Doc.id];

    batch.set(questionDoc, {
        answerLimit: question.answerLimit,
        isRevealed: false,
        clueIds,
    });
    batch.set(clue1Doc, {
        questionId: questionDoc.id,
        isRevealed: false,
        text: question.clues[0].text,
        answerLimit: question.clues[0].answerLimit,
    });
    batch.set(clue2Doc, {
        questionId: questionDoc.id,
        isRevealed: false,
        text: question.clues[1].text,
        answerLimit: question.clues[1].answerLimit,
    });
    batch.set(clue3Doc, {
        questionId: questionDoc.id,
        isRevealed: false,
        text: question.clues[2].text,
        answerLimit: question.clues[2].answerLimit,
    });
    batch.set(clue4Doc, {
        questionId: questionDoc.id,
        isRevealed: false,
        text: question.clues[3].text,
        answerLimit: question.clues[3].answerLimit,
    });
    batch.update(quizDoc, {
        questionIds: arrayUnion(questionDoc.id),
    });
    
    return batch.commit().then(() => ({ questionId: questionDoc.id, clueIds }));
};

export const revealNextClue = (
    quizId: string,
    nextClueId: string,
    currentClueId?: string,
    db: firebase.firestore.Firestore = firebase.app().firestore(),
    serverTimestamp = firebase.firestore.FieldValue.serverTimestamp,
) => {
    const batch = db.batch();

    // Update the current clue, if any, to set the closedAt time
    if (currentClueId) {
        const currentClueDoc = db.doc(`quizzes/${quizId}/clues/${currentClueId}`);
        batch.update(currentClueDoc, {
            closedAt: serverTimestamp(),
        });
    }

    // Update the next clue to set the revealedAt time, and set isRevealed to true
    const nextClueDoc = db.doc(`quizzes/${quizId}/clues/${nextClueId}`);
    batch.update(nextClueDoc,{
        isRevealed: true,
        revealedAt: serverTimestamp(),
    });
    
    return batch.commit();
};

export const revealNextQuestion = (
    quizId: string,
    nextQuestionId: string,
    currentClueId?: string,
    db: firebase.firestore.Firestore = firebase.app().firestore(),
    serverTimestamp = firebase.firestore.FieldValue.serverTimestamp,
) => {
    const batch = db.batch();

    // Close the current clue, if any, for answer submissions
    if (currentClueId) {
        const currentClueDoc = db.doc(`quizzes/${quizId}/clues/${currentClueId}`);
        batch.update(currentClueDoc, {
            closedAt: serverTimestamp(),
        });
    }

    // Reveal the next question
    const nextQuestionDoc = db.doc(`quizzes/${quizId}/questions/${nextQuestionId}`);
    batch.update(nextQuestionDoc, {
        isRevealed: true,
    });

    // Move the quiz to the next question
    const quizDoc = db.doc(`quizzes/${quizId}`);
    batch.update(quizDoc, {
        currentQuestionId: nextQuestionId
    });

    return batch.commit();
};

export const closeLastClue = (
    quizId: string,
    currentClueId: string,
    db: firebase.firestore.Firestore = firebase.app().firestore(),
    serverTimestamp = firebase.firestore.FieldValue.serverTimestamp,
) => {
    return db.doc(`quizzes/${quizId}/clues/${currentClueId}`)
        .update({
            closedAt: serverTimestamp(),
        });
};