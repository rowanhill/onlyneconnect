import firebase from 'firebase';
import { Four, Three } from '.';

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
    clues: Four<ClueSpec>;
    type: 'connection';
}

export interface SequenceQuestionSpec {
    id?: string;
    answerLimit: number | null;
    clues: Three<ClueSpec>;
    type: 'sequence';
}

export const createConnectionOrSequenceQuestion = (
    quizId: string,
    question: ConnectionQuestionSpec | SequenceQuestionSpec,
    db: firebase.firestore.Firestore = firebase.app().firestore(),
    arrayUnion = firebase.firestore.FieldValue.arrayUnion,
) => {
    const batch = db.batch();

    const quizDoc = db.doc(`quizzes/${quizId}`);
    const clueAndDocs = question.clues.map((clue) => ({ clue, doc: db.collection(`quizzes/${quizId}/clues`).doc() }));

    const questionDoc = db.collection(`quizzes/${quizId}/questions`).doc();
    const clueIds = clueAndDocs.map((cad) => cad.doc.id);
    batch.set(questionDoc, {
        type: question.type,
        answerLimit: question.answerLimit,
        isRevealed: false,
        clueIds,
    });

    for (const { clue, doc } of clueAndDocs) {
        batch.set(doc, {
            questionId: questionDoc.id,
            isRevealed: false,
            text: clue.text,
            answerLimit: clue.answerLimit,
        });
    }
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