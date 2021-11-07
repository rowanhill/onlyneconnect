// Hack: copied from src/models/index.ts!
export interface Quiz {
    name: string;
    ownerId: string;
    questionIds: string[];
    currentQuestionId: string | null;
    isComplete: boolean;
    youTubeVideoId: string | null;
}
export type Four<T> = [T, T, T, T];
export interface WallSecrets {
    type: 'wall';
    solution: Four<{ texts: Four<string>; connection: string; }>;
}
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
export interface Team {
    name: string;
    quizId: string;
    points: number;
    captainId: string;
}