import { Question, throwBadQuestionType } from './models';

export const calculateScore = (question: Question, clueIndex: number) => {
    switch (question.type) {
        case 'connection':
        case 'sequence':
        if (clueIndex === 0) {
            return 5;
        } else {
            return 4 - clueIndex;
        }
        default:
            throwBadQuestionType(question);
    }
};