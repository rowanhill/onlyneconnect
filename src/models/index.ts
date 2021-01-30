import firebase from 'firebase/app';
import 'firebase/firestore';

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
export type Sixteen<T> = [
    T, T, T, T,
    T, T, T, T,
    T, T, T, T,
    T, T, T, T,
];
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
export interface WallQuestion {
    clueId: string;
    isRevealed: boolean;
    answerLimit: null;
    type: 'wall';
}
export interface MissingVowelsQuestion {
    clueId: string;
    isRevealed: boolean;
    answerLimit: number|null;
    type: 'missing-vowels';
}
export type Question = ConnectionQuestion | SequenceQuestion | WallQuestion | MissingVowelsQuestion;

export function throwBadQuestionType(question: never): never;
export function throwBadQuestionType(question: Question) {
    throw new Error(`Unhandled question type: ${question.type}`);
}

export interface TextClue {
    type: 'text';
    questionId: string;
    isRevealed: boolean;
    text: string;
    answerLimit: number|null;
    revealedAt?: firebase.firestore.Timestamp;
    closedAt?: firebase.firestore.Timestamp;
}
export interface CompoundTextClue {
    type: 'compound-text';
    questionId: string;
    isRevealed: boolean;
    texts: Four<string>;
    answerLimit: number|null;
    revealedAt?: firebase.firestore.Timestamp;
    closedAt?: firebase.firestore.Timestamp;
}
export interface FourByFourTextClue {
    type: 'four-by-four-text';
    questionId: string;
    isRevealed: boolean;
    texts: Sixteen<string>;
    answerLimit: null;
    revealedAt?: firebase.firestore.Timestamp;
    closedAt?: firebase.firestore.Timestamp;
}
export type Clue = TextClue | CompoundTextClue | FourByFourTextClue;

export function throwBadClueType(clue: never): never;
export function throwBadClueType(clue: Clue) {
    throw new Error(`Unhandled clue type: ${clue.type}`);
}

export interface FourByFourTextClueSecrets {
    solution: Four<{ texts: Four<string>; }>;
    type: 'four-by-four-text';
}

export type ClueSecrets = FourByFourTextClueSecrets;

export interface SimpleAnswer {
    questionId: string;
    clueId: string;
    teamId: string;
    text: string;
    points?: number;
    correct?: boolean;
    submittedAt: firebase.firestore.Timestamp;
    type: 'simple';
}

export interface WallAnswer {
    questionId: string;
    clueId: string;
    teamId: string;
    groupsCorrect: Four<boolean|null>;
    connections: Four<{ text: string; correct: boolean|null; }>;
    points: number;
    submittedAt: firebase.firestore.Timestamp;
    type: 'wall';
}

export type Answer = SimpleAnswer | WallAnswer;

export interface WallInProgress {
    selectedIndexes: number[];
}