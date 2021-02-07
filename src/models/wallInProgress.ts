import firebase from 'firebase/app';
import 'firebase/firestore';
import { WallInProgress } from '.';

export const createWallInProgress = (
    quizId: string,
    questionId: string,
    clueId: string,
    teamId: string,
    db: firebase.firestore.Firestore = firebase.app().firestore(),
) => {
    const wallInProgress: WallInProgress = {
        teamId,
        clueId,
        questionId,
        selectedTexts: [],
    };
    return db.collection(`/quizzes/${quizId}/wallInProgress`)
        .add(wallInProgress)
        .then((doc) => doc.id);
};

export const updateWallInProgressSelections = (
    quizId: string,
    wipId: string,
    selectedTexts: string[],
    db: firebase.firestore.Firestore = firebase.app().firestore(),
) => {
    const updateData: Partial<WallInProgress> = {
        selectedTexts
    };
    db.doc(`/quizzes/${quizId}/wallInProgress/${wipId}`).update(updateData);
    return null;
};