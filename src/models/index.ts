import firebase from 'firebase/app';
import 'firebase/firestore';

export interface Team {
    name: string;
    quizId: string;
    points: number;
    captainId: string;
    requireTeamPasscode?: boolean;
}

export interface TeamSecrets {
    quizId: string;
    quizPasscode: string | null;
    passcode: string | null;
}

export interface PlayerTeam {
    teamId: string;
    teamPasscode: string|null;
}

export interface Quiz {
    name: string;
    ownerId: string;
    questionIds: string[];
    currentQuestionId: string | null;
    isComplete: boolean;
    isZoomEnabled: boolean;
    ownerZoomId: number|null;
    requireQuizPasscode?: boolean;
}

export interface QuizSecrets {
    passcode: string|null;
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
    connection?: string;
    answerLimit: null;
    type: 'connection';
}
export interface SequenceQuestion {
    clueIds: Three<string>;
    isRevealed: boolean;
    connection?: string;
    exampleLastInSequence?: string;
    answerLimit: null;
    type: 'sequence';
}
export interface WallQuestion {
    clueId: string;
    isRevealed: boolean;
    connections?: Four<string>;
    answerLimit: null;
    type: 'wall';
}
export interface MissingVowelsQuestion {
    clueId: string;
    isRevealed: boolean;
    connection?: string;
    answerLimit: number;
    type: 'missing-vowels';
}
export type Question = ConnectionQuestion | SequenceQuestion | WallQuestion | MissingVowelsQuestion;

export function getClueIds(question: Question) {
    if (question.type === 'wall' || question.type === 'missing-vowels') {
        return [question.clueId];
    } else {
        return question.clueIds;
    }
}

export interface ConnectionSecrets {
    type: 'connection';
    connection: string;
}

export interface SequenceSecrets {
    type: 'sequence';
    connection: string;
    exampleLastInSequence: string;
}

export interface WallSecrets {
    type: 'wall';
    solution: Four<{ texts: Four<string>; }>;
    connections: Four<string>;
}

export interface MissingVowelsSecrets {
    type: 'missing-vowels';
    solution: Four<string>;
    connection: string;
}

export type QuestionSecrets = ConnectionSecrets | SequenceSecrets | WallSecrets | MissingVowelsSecrets;

export function throwBadQuestionType(question: never): never;
export function throwBadQuestionType(question: Question) {
    throw new Error(`Unhandled question type: ${question.type}`);
}

export interface TextClue {
    type: 'text';
    questionId: string;
    isRevealed: boolean;
    text: string;
    answerLimit: number;
    revealedAt?: firebase.firestore.Timestamp;
    closedAt?: firebase.firestore.Timestamp;
}
export interface CompoundTextClue {
    type: 'compound-text';
    questionId: string;
    isRevealed: boolean;
    texts: Four<string>;
    answerLimit: null;
    solution?: Four<string>;
    revealedAt?: firebase.firestore.Timestamp;
    closedAt?: firebase.firestore.Timestamp;
}
export interface FourByFourTextClue {
    type: 'four-by-four-text';
    questionId: string;
    isRevealed: boolean;
    texts: Sixteen<string>;
    answerLimit: null;
    solution?: Four<{ texts: Four<string>; }>;
    revealedAt?: firebase.firestore.Timestamp;
    closedAt?: firebase.firestore.Timestamp;
}
export type Clue = TextClue | CompoundTextClue | FourByFourTextClue;

export function throwBadClueType(clue: never): never;
export function throwBadClueType(clue: Clue) {
    throw new Error(`Unhandled clue type: ${clue.type}`);
}

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
    connections: Four<{ text: string; correct: boolean|null; }>;
    points?: number;
    submittedAt: firebase.firestore.Timestamp;
    type: 'wall';
}

export type Answer = SimpleAnswer | WallAnswer;

export interface WallInProgress {
    // static properties
    questionId: string;
    clueId: string;
    teamId: string;

    // dynamic properties
    selectedTexts: string[];

    // Sensitive properties, written to by cloud functions
    correctGroups?: { texts: Four<string>; solutionGroupIndex: number; }[];
    remainingLives?: number;
}

export interface UserPermissions {
    canCreateZoomSessions: boolean;
}