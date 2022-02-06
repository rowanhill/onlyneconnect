import * as admin from 'firebase-admin';
admin.initializeApp();

export { checkIfWallGroupIsInSolution } from './checkWallGroup';
export { resetQuiz } from './resetQuiz';
export { generateZoomToken } from './generateZoomToken';