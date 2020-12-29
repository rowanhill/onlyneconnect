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

export interface Question {
    clueIds: string[];
    isRevealed: boolean;
    answerLimit: number|null;
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
    submittedAt: firebase.firestore.Timestamp;
}