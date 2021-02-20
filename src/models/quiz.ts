import firebase from 'firebase/app';
import 'firebase/firestore';
import { Clue, CompoundTextClue, ConnectionQuestion, ConnectionSecrets, Four, FourByFourTextClue, MissingVowelsQuestion, MissingVowelsSecrets, QuestionSecrets, SequenceQuestion, SequenceSecrets, Sixteen, TextClue, Three, WallQuestion, WallSecrets } from '.';

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

export interface TextClueSpec {
    id?: string;
    text: string;
    answerLimit: number | null;
    type: 'text';
}

export interface CompoundClueSpec {
    id?: string;
    texts: Four<string>;
    answerLimit: number | null;
    type: 'compound-text';
}

export interface FourByFourTextClueSpec {
    id?: string;
    solution: Four<{ texts: Four<string>; }>;
    connections: Four<string>;
    answerLimit: null;
    type: 'four-by-four-text';
}

export interface ConnectionQuestionSpec {
    id?: string;
    answerLimit: number | null;
    clues: Four<TextClueSpec>;
    connection: string;
    type: 'connection';
}

export interface SequenceQuestionSpec {
    id?: string;
    answerLimit: number | null;
    clues: Three<TextClueSpec>;
    connection: string;
    exampleLastInSequence: string;
    type: 'sequence';
}

export interface WallQuestionSpec {
    id?: string;
    answerLimit: null;
    clue: FourByFourTextClueSpec;
    type: 'wall';
}

export interface MissingVowelsQuestionSpec {
    id?: string;
    answerLimit: number | null;
    clue: CompoundClueSpec;
    connection: string;
    type: 'missing-vowels';
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
    const secretsDoc = db.doc(`/quizzes/${quizId}/questionSecrets/${questionDoc.id}`);
    const clueIds = clueAndDocs.map((cad) => cad.doc.id);
    batch.set<ConnectionQuestion|SequenceQuestion>(questionDoc as any, {
        type: question.type,
        answerLimit: question.answerLimit,
        isRevealed: false,
        clueIds: clueIds as any,
    });
    if (question.type === 'connection') {
        batch.set<ConnectionSecrets>(secretsDoc as any, {
            type: question.type,
            connection: question.connection,
        });
    } else {
        batch.set<SequenceSecrets>(secretsDoc as any, {
            type: question.type,
            connection: question.connection,
            exampleLastInSequence: question.exampleLastInSequence,
        });
    }

    for (const { clue, doc } of clueAndDocs) {
        batch.set<TextClue>(doc as any, {
            questionId: questionDoc.id,
            isRevealed: false,
            text: clue.text,
            answerLimit: clue.answerLimit,
            type: 'text',
        });
    }
    batch.update(quizDoc, {
        questionIds: arrayUnion(questionDoc.id),
    });
    
    return batch.commit().then(() => ({ questionId: questionDoc.id, clueIds }));
};

function shuffleArray<T>(array: T[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
export const createWallQuestion = (
    quizId: string,
    question: WallQuestionSpec,
    db: firebase.firestore.Firestore = firebase.app().firestore(),
    arrayUnion = firebase.firestore.FieldValue.arrayUnion,
) => {
    const batch = db.batch();

    const quizDoc = db.doc(`quizzes/${quizId}`);
    const clueDoc = db.collection(`quizzes/${quizId}/clues`).doc();
    const questionDoc = db.collection(`quizzes/${quizId}/questions`).doc();
    const secretsDoc = db.doc(`quizzes/${quizId}/questionSecrets/${questionDoc.id}`);

    batch.set<WallQuestion>(questionDoc as any, {
        type: question.type,
        answerLimit: question.answerLimit,
        isRevealed: false,
        clueId: clueDoc.id,
    });

    batch.set<WallSecrets>(secretsDoc as any, {
        solution: question.clue.solution,
        connections: question.clue.connections,
        type: question.type,
    });

    const flattenedTexts = question.clue.solution.flatMap((group) => group.texts) as Sixteen<string>;
    shuffleArray(flattenedTexts);
    batch.set<FourByFourTextClue>(clueDoc as any, {
        questionId: questionDoc.id,
        isRevealed: false,
        texts: flattenedTexts,
        answerLimit: question.clue.answerLimit,
        type: question.clue.type,
    });

    batch.update(quizDoc, {
        questionIds: arrayUnion(questionDoc.id),
    });
    
    return batch.commit().then(() => ({ questionId: questionDoc.id, clueId: clueDoc.id }));
};

export const createMissingVowelsQuestion = (
    quizId: string,
    question: MissingVowelsQuestionSpec,
    db: firebase.firestore.Firestore = firebase.app().firestore(),
    arrayUnion = firebase.firestore.FieldValue.arrayUnion,
) => {
    const batch = db.batch();

    const quizDoc = db.doc(`quizzes/${quizId}`);
    const clueDoc = db.collection(`quizzes/${quizId}/clues`).doc();

    const questionDoc = db.collection(`quizzes/${quizId}/questions`).doc();
    const secretsDoc = db.doc(`quizzes/${quizId}/questionSecrets/${questionDoc.id}`);
    batch.set<MissingVowelsQuestion>(questionDoc as any, {
        type: question.type,
        answerLimit: question.answerLimit,
        isRevealed: false,
        clueId: clueDoc.id,
    });
    batch.set<MissingVowelsSecrets>(secretsDoc as any, {
        type: question.type,
        connection: question.connection,
    });

    batch.set<CompoundTextClue>(clueDoc as any, {
        questionId: questionDoc.id,
        isRevealed: false,
        texts: question.clue.texts,
        answerLimit: question.clue.answerLimit,
        type: question.clue.type,
    });
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

export const copySolutionFromSecretToClue = (
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
    });
};