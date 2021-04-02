import firebase from 'firebase/app';
import 'firebase/firestore';
import { Clue, CompoundTextClue, ConnectionQuestion, ConnectionSecrets, FourByFourTextClue, MissingVowelsQuestion, MissingVowelsSecrets, QuestionSecrets, Quiz, SequenceQuestion, SequenceSecrets, TextClue, throwBadQuestionType, WallQuestion, WallSecrets } from '.';
import { ConnectionQuestionSpec, SequenceQuestionSpec, WallQuestionSpec, MissingVowelsQuestionSpec, newFromSpec } from './questionSpec';

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
    batch.set<Quiz>(quizDoc as any, { name: quizName, ownerId, questionIds: [], currentQuestionId: null, isComplete: false, youTubeVideoId: null });
    return batch.commit().then(() => secretsDoc.id);
};

export const createConnectionOrSequenceQuestion = (
    quizId: string,
    questionSpec: ConnectionQuestionSpec | SequenceQuestionSpec,
    db: firebase.firestore.Firestore = firebase.app().firestore(),
    arrayUnion = firebase.firestore.FieldValue.arrayUnion,
) => {
    const batch = db.batch();

    const newData = newFromSpec(questionSpec);

    const quizDoc = db.doc(`quizzes/${quizId}`);
    const questionDoc = db.collection(`quizzes/${quizId}/questions`).doc();
    const clues = newData.clues.map((clue) => ({ ...clue.data, questionId: questionDoc.id } as TextClue));
    const cluesAndDocs = clues.map((clue) => ({ clue, doc: db.collection(`quizzes/${quizId}/clues`).doc() }));

    const clueIds = cluesAndDocs.map((cad) => cad.doc.id) as any;
    batch.set<ConnectionQuestion|SequenceQuestion>(questionDoc as any, { ...newData.question, clueIds });

    const secretsDoc = db.doc(`/quizzes/${quizId}/questionSecrets/${questionDoc.id}`);
    batch.set<ConnectionSecrets|SequenceSecrets>(secretsDoc as any, newData.secrets);

    for (const { clue, doc } of cluesAndDocs) {
        batch.set<TextClue>(doc as any, { ...clue, questionId: questionDoc.id });
    }

    batch.update(quizDoc, {
        questionIds: arrayUnion(questionDoc.id),
    });
    
    return batch.commit().then(() => ({ questionId: questionDoc.id, clueIds }));
};

export const createWallQuestion = (
    quizId: string,
    questionSpec: WallQuestionSpec,
    db: firebase.firestore.Firestore = firebase.app().firestore(),
    arrayUnion = firebase.firestore.FieldValue.arrayUnion,
) => {
    const batch = db.batch();

    const newData = newFromSpec(questionSpec);

    const quizDoc = db.doc(`quizzes/${quizId}`);
    const clueDoc = db.collection(`quizzes/${quizId}/clues`).doc();
    const questionDoc = db.collection(`quizzes/${quizId}/questions`).doc();
    const secretsDoc = db.doc(`quizzes/${quizId}/questionSecrets/${questionDoc.id}`);

    batch.set<WallQuestion>(questionDoc as any, { ...newData.question, clueId: clueDoc.id });
    batch.set<WallSecrets>(secretsDoc as any, newData.secrets);
    batch.set<FourByFourTextClue>(clueDoc as any, { ...newData.clue.data, questionId: questionDoc.id });

    batch.update(quizDoc, {
        questionIds: arrayUnion(questionDoc.id),
    });
    
    return batch.commit().then(() => ({ questionId: questionDoc.id, clueId: clueDoc.id }));
};

export const createMissingVowelsQuestion = (
    quizId: string,
    questionSpec: MissingVowelsQuestionSpec,
    db: firebase.firestore.Firestore = firebase.app().firestore(),
    arrayUnion = firebase.firestore.FieldValue.arrayUnion,
) => {
    const batch = db.batch();

    const newData = newFromSpec(questionSpec);

    const quizDoc = db.doc(`quizzes/${quizId}`);
    const clueDoc = db.collection(`quizzes/${quizId}/clues`).doc();
    const questionDoc = db.collection(`quizzes/${quizId}/questions`).doc();
    const secretsDoc = db.doc(`quizzes/${quizId}/questionSecrets/${questionDoc.id}`);

    batch.set<MissingVowelsQuestion>(questionDoc as any, { ...newData.question, clueId: clueDoc.id });
    batch.set<MissingVowelsSecrets>(secretsDoc as any, newData.secrets);
    batch.set<CompoundTextClue>(clueDoc as any, { ...newData.clue.data, questionId: questionDoc.id });

    batch.update(quizDoc, {
        questionIds: arrayUnion(questionDoc.id),
    });
    
    return batch.commit().then(() => ({ questionId: questionDoc.id, clueId: clueDoc.id }));
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
    db: firebase.firestore.Firestore = firebase.app().firestore(),
) => {
    const batch = db.batch();

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

export const revealWallSolution = (
    quizId: string,
    questionId: string,
    clueId: string,
    db: firebase.firestore.Firestore = firebase.app().firestore(),
) => {
    const clueDoc = db.doc(`quizzes/${quizId}/clues/${clueId}`);
    const secretsDoc = db.doc(`quizzes/${quizId}/questionSecrets/${questionId}`);

    return db.runTransaction(async (transaction) => {
        const [clueSnapshot, secretsSnapshot] = await Promise.all([transaction.get(clueDoc), transaction.get(secretsDoc)]);
        if (!clueSnapshot.exists) {
            throw new Error(`Clue ${quizId}/${clueId} does not exist`);
        }
        const clueData = clueSnapshot.data() as Clue;
        if (!secretsSnapshot.exists) {
            throw new Error(`Secret for clue ${quizId}/${questionId} does not exist`);
        }
        const secretsData = secretsSnapshot.data() as QuestionSecrets;
        if (clueData.type !== 'four-by-four-text') {
            throw new Error(`Expected clue to be four-by-four-text, but was ${clueData.type}`);
        }
        if (secretsData.type !== 'wall') {
            throw new Error(`Expected question secrets to be of type wall, was of type ${secretsData.type}`);
        }
        transaction.update(clueDoc, {
            solution: secretsData.solution,
        });
        return null;
    });
};

export const revealAnswer = (
    quizId: string,
    questionId: string,
    currentClueId?: string,
    db: firebase.firestore.Firestore = firebase.app().firestore(),
    serverTimestamp = firebase.firestore.FieldValue.serverTimestamp,
) => {
    const questionDoc = db.doc(`quizzes/${quizId}/questions/${questionId}`);
    const secretsDoc = db.doc(`quizzes/${quizId}/questionSecrets/${questionId}`);

    return db.runTransaction(async (transaction) => {
        const secretsSnapshot = await transaction.get(secretsDoc);
        if (!secretsSnapshot.exists) {
            throw new Error(`Secret for clue ${quizId}/${questionId} does not exist`);
        }
        const secretsData = secretsSnapshot.data() as QuestionSecrets;

        // Close the current clue, if any, for answer submissions
        if (currentClueId) {
            const currentClueDoc = db.doc(`quizzes/${quizId}/clues/${currentClueId}`);
            transaction.update(currentClueDoc, {
                closedAt: serverTimestamp(),
            });
        }
        
        // Copy the connection(s) (and last in sequence, if appropriate) from the secret to the question
        switch (secretsData.type) {
            case 'connection':
            case 'missing-vowels':
                transaction.update(questionDoc, {
                    connection: secretsData.connection
                });
                break;
            case 'sequence':
                transaction.update(questionDoc, {
                    connection: secretsData.connection,
                    exampleLastInSequence: secretsData.exampleLastInSequence,
                });
                break;
            case 'wall':
                transaction.update(questionDoc, {
                    connections: secretsData.connections
                });
                break;
            default:
                throwBadQuestionType(secretsData);
        }
        return null;
    });
};

export const closeQuiz = (
    quizId: string,
    db: firebase.firestore.Firestore = firebase.app().firestore(),
) => {
    return db.doc(`quizzes/${quizId}`).update({ isComplete: true });
};