import { calculateScore } from './answerScoreCalculator';
import { Question } from './models';

describe('calculateScore', () => {
    describe('with a connection question', () => {
        it.each([[5, 0], [3, 1], [2, 2], [1, 3]])('returns %i for an answer at clue index %i', (expectedScore, clueIndex) => {
            const score = calculateScore({ type: 'connection' } as Question, clueIndex);
            expect(score).toBe(expectedScore);
        });
    });

    describe('with a sequence question', () => {
        it.each([[5, 0], [3, 1], [2, 2]])('returns %i for an answer at clue index %i', (expectedScore, clueIndex) => {
            const score = calculateScore({ type: 'sequence' } as Question, clueIndex);
            expect(score).toBe(expectedScore);
        });
    });
});