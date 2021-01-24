import { calculateUpdatedScores } from './answerScoreCalculator';
import { CollectionQueryItem } from './hooks/useCollectionResult';
import { Answer, Question } from './models';

describe('calculateUpdatedScores', () => {
    describe('with a connection question', () => {
        const answer: CollectionQueryItem<Answer> = { id: '123', data: {} as any };
        const question: Question = { type: 'connection' } as Question;

        it.each(
            [[5, 0], [3, 1], [2, 2], [1, 3]]
        )('returns one update with a score of %i for the correctly answered question on clue index %i', (expectedScore, clueIndex) => {
            const updates = calculateUpdatedScores(answer, true, question, clueIndex, [answer]);
            expect(updates).toEqual([{ answerId: '123', score: expectedScore, correct: true }]);
        });

        it('returns one update with a score of 0 for the incorrectly answered question', () => {
            const updates = calculateUpdatedScores(answer, false, question, 0, [answer]);
            expect(updates).toEqual([{ answerId: '123', score: 0, correct: false }]);
        });
    });

    describe('with a sequence question', () => {
        const answer: CollectionQueryItem<Answer> = { id: '123', data: {} as any };
        const question: Question = { type: 'sequence' } as Question;

        it.each(
            [[5, 0], [3, 1], [2, 2], [1, 3]]
        )('returns one update with a score of %i for a correct answer with %i previous correct answers', (expectedScore, clueIndex) => {
            const updates = calculateUpdatedScores(answer, true, question, clueIndex, [answer]);
            expect(updates).toEqual([{ answerId: '123', score: expectedScore, correct: true }]);
        });

        it('returns one update with a score of 0 for the incorrectly answered question', () => {
            const updates = calculateUpdatedScores(answer, false, question, 0, [answer]);
            expect(updates).toEqual([{ answerId: '123', score: 0, correct: false }]);
        });
    });


    describe('with a missing vowels question', () => {
        const answer: CollectionQueryItem<Answer> = { id: '123', data: {} as any };
        const question: Question = { type: 'missing-vowels' } as Question;

        describe('with no subsequent marked answers', () => {
            it.each(
                [[4, 0], [3, 1], [3, 2], [2, 3], [2, 4], [2, 5], [1, 6], [1, 100]]
            )('returns one update with a score of %i for a correct answer with %i previous correct answers and some incorrect / unscored', (expectedScore, prevCorrect) => {
                const answers: Array<CollectionQueryItem<Answer>> = [
                    { id: 'other-1', data: { correct: false } as any },
                    { id: 'other-2', data: { correct: undefined } as any },
                ];
                for (let i = 0; i < prevCorrect; i++) {
                    answers.push({ id: 'other-correct-' + i, data: { correct: true } as any });
                }
                answers.push(answer);
                const updates = calculateUpdatedScores(answer, true, question, 0, answers);
                expect(updates).toEqual([{ answerId: '123', score: expectedScore, correct: true }]);
            });
    
            it('returns one update with a score of 0 for the incorrectly answered question', () => {
                const updates = calculateUpdatedScores(answer, false, question, 0, [answer]);
                expect(updates).toEqual([{ answerId: '123', score: 0, correct: false }]);
            });
        });

        it('returns updates for subsequent marked answers when marking correct', () => {
            const answers: Array<CollectionQueryItem<Answer>> = [
                { id: 'other-1', data: { correct: false } as any },
                { id: 'other-2', data: { correct: undefined } as any },
                answer,
                { id: 'other-2', data: { correct: true, score: 4 } as any },
                { id: 'other-3', data: { correct: false } as any },
                { id: 'other-4', data: { correct: true, score: 3 } as any },
                { id: 'other-5', data: { correct: true, score: 3 } as any },
            ];
            const updates = calculateUpdatedScores(answer, true, question, 0, answers);
            expect(updates).toEqual([
                { answerId: '123', score: 4, correct: true },
                { answerId: 'other-2', score: 3 },
                { answerId: 'other-4', score: 3 },
                { answerId: 'other-5', score: 2 },
            ]);
        });

        it('returns updates for subsequent marked answers when marking previously correct to incorrect', () => {
            answer.data.correct = true;
            answer.data.points = 4;
            const answers: Array<CollectionQueryItem<Answer>> = [
                { id: 'other-1', data: { correct: false } as any },
                { id: 'other-2', data: { correct: undefined } as any },
                answer,
                { id: 'other-2', data: { correct: true, score: 3 } as any },
                { id: 'other-3', data: { correct: false } as any },
                { id: 'other-4', data: { correct: true, score: 3 } as any },
                { id: 'other-5', data: { correct: true, score: 2 } as any },
            ];
            const updates = calculateUpdatedScores(answer, false, question, 0, answers);
            expect(updates).toEqual([
                { answerId: '123', score: 0, correct: false },
                { answerId: 'other-2', score: 4 },
                { answerId: 'other-4', score: 3 },
                { answerId: 'other-5', score: 3 },
            ]);
        });
    });
});