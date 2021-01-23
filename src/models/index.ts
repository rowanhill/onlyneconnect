import firebase from 'firebase';

export interface Team {
    name: string;
    quizId: string;
    points: number;
    captainId: string;
}

export interface PlayerTeam {
    teamId: string;
    teamPasscode: string;
}

export interface Quiz {
    name: string;
    ownerId: string;
    questionIds: string[];
    currentQuestionId: string | null;
}

export interface QuizSecrets {
    passcode: string;
}

export type Four<T> = [T, T, T, T];
export type Three<T> = [T, T, T];
export interface ConnectionQuestion {
    clueIds: Four<string>;
    isRevealed: boolean;
    answerLimit: number|null;
    type: 'connection';
}
export interface SequenceQuestion {
    clueIds: Three<string>;
    isRevealed: boolean;
    answerLimit: number|null;
    type: 'sequence';
}
export type Question = ConnectionQuestion | SequenceQuestion;

export function throwBadQuestionType(question: never): never;
export function throwBadQuestionType(question: Question) {
    throw new Error(`Unhandled question type: ${question.type}`);
}

export interface Clue {
    questionId: string;
    isRevealed: boolean;
    text: string;
    answerLimit: number|null;
    revealedAt?: firebase.firestore.Timestamp;
    closedAt?: firebase.firestore.Timestamp;
}

export interface Answer {
    questionId: string;
    clueId: string;
    teamId: string;
    text: string;
    points?: number;
    correct?: boolean;
    submittedAt: firebase.firestore.Timestamp;
}