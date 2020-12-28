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
    currentQuestionIndex: number;
    ownerId: string;
}

export interface Question {
    questionIndex: number;
    currentClueIndex: number;
    answerLimit: number|null;
    revealedAt?: firebase.firestore.Timestamp;
    closedAt?: firebase.firestore.Timestamp;
}

export interface Clue {
    clueIndex: number;
    text: string;
    answerLimit: number|null;
    revealedAt?: firebase.firestore.Timestamp;
}

export interface Answer {
    questionId: string;
    teamId: string;
    text: string;
    points?: number;
    timestamp: firebase.firestore.Timestamp;
}