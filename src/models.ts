export interface Team {
    name: string;
    quizId: string;
}

export interface Quiz {
    name: string;
    currentQuestionIndex: number;
}

export interface Question {
    questionIndex: number;
    currentClueIndex: number;
}

export interface Clue {
    clueIndex: number;
    text: string;
}