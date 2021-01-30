import { CollectionQueryItem } from './hooks/useCollectionResult';
import { Question, SimpleAnswer, throwBadQuestionType } from './models';
import { AnswerUpdate } from './models/answer';

const firstMissingVowelsScores = [4, 3, 3, 2, 2, 2];
const findPointsForNthCorrectMissingVowelsAnswer = (n: number) => {
    if (n < firstMissingVowelsScores.length) {
        return firstMissingVowelsScores[n];
    } else {
        return 1;
    }
}

export const calculateUpdatedScores = (
    answerId: string,
    correct: boolean,
    question: Question,
    clueIndex: number,
    answers: CollectionQueryItem<SimpleAnswer>[],
): AnswerUpdate[] => {
    switch (question.type) {
        case 'connection':
        case 'sequence':
            // Points are awarded based on the number of clues revealed at the time:
            if (!correct) {
                return [{ answerId: answerId, score: 0, correct }];
            }
            if (clueIndex === 0) {
                return [{ answerId: answerId, score: 5, correct }];
            } else {
                return [{ answerId: answerId, score: 4 - clueIndex, correct }];
            }
        case 'missing-vowels':
            const result = [];
            let alteredAnswerHasBeenSeen = false;
            let numCorrectAnswers = 0;
            for (const answerItem of answers) {
                if (answerItem.id === answerId) {
                    alteredAnswerHasBeenSeen = true;
                    if (correct) {
                        const newScore = findPointsForNthCorrectMissingVowelsAnswer(numCorrectAnswers);
                        result.push({ answerId: answerItem.id, score: newScore, correct });
                        numCorrectAnswers++;
                    } else {
                        result.push({ answerId: answerItem.id, score: 0, correct });
                    }
                } else if (answerItem.data.correct === true) {
                    if (alteredAnswerHasBeenSeen) {
                        const newScore = findPointsForNthCorrectMissingVowelsAnswer(numCorrectAnswers);
                        result.push({ answerId: answerItem.id, score: newScore });
                    }
                    numCorrectAnswers++;
                }
            }
            return result;
        case 'wall':
            // Wall answers are handled separately
            throw new Error('Cannot update scores for wall type questions');
        default:
            throwBadQuestionType(question);
    }
};