import { render, screen } from '@testing-library/react';
import React from 'react';
import { CluesContext, QuestionsContext } from './contexts/quizPage';
import { CurrentQuestion } from './CurrentQuestion';
import { CollectionQueryItem, CollectionQueryResult } from './hooks/useCollectionResult';
import { Clue, ConnectionQuestion, Four, Question, SequenceQuestion, TextClue, Three } from './models';

describe('<CurrentQuestion>', () => {
    const questionId = 'q1';
    function textClue(options: Partial<TextClue> = {}): TextClue {
        return { answerLimit: 1, isRevealed: false, questionId, text: 'Clue text', type: 'text', ...options };
    }

    interface CurrentQuestionWithProvidersProps {
        question: CollectionQueryItem<Question>;
        visibleClues: CollectionQueryItem<Clue>[];
    }
    function CurrentQuestionWithProviders({ question, visibleClues }: CurrentQuestionWithProvidersProps) {
        const questionContext: CollectionQueryResult<Question> = {
            loading: false,
            error: undefined,
            data: [ question ],
        };
        const cluesContext: CollectionQueryResult<Clue> = {
            loading: false,
            error: undefined,
            data: visibleClues,
        };
        return (
            <QuestionsContext.Provider value={questionContext}>
            <CluesContext.Provider value={cluesContext}>
                <CurrentQuestion currentQuestionItem={question} />
            </CluesContext.Provider>
            </QuestionsContext.Provider>
        );
    }

    it('shows a waiting message when there is no current question', () => {
        render(<CurrentQuestionWithProviders question={undefined as any} visibleClues={[]} />);
        expect(screen.queryByText(/waiting for quiz to start/i)).toBeInTheDocument();
    });

    it('shows a waiting message when no clues are revealed', () => {
        render(<CurrentQuestionWithProviders question={'dummy q' as any} visibleClues={[]} />);
        expect(screen.queryByText(/waiting for question to start/i)).toBeInTheDocument();
    });

    describe('when the current question is a connection-type question', () => {
        let question: CollectionQueryItem<ConnectionQuestion>;
        let clues: Four<CollectionQueryItem<TextClue>>;
        beforeEach(() => {
            clues = [
                { id: 'c1', data: textClue({ text: 'Clue: ABC' }) },
                { id: 'c2', data: textClue({ text: 'Clue: DEF' }) },
                { id: 'c3', data: textClue({ text: 'Clue: GHI' }) },
                { id: 'c4', data: textClue({ text: 'Clue: JKL' }) },
            ];
            question = {
                id: questionId,
                data: {
                    type: 'connection',
                    answerLimit: null,
                    isRevealed: false,
                    clueIds: clues.map(c => c.id) as Four<string>,
                },
            };
        });

        it.each([[1], [2], [3], [4]])('shows all %i revealed clues', (numRevealed) => {
            const visibleClues = clues.slice(0, numRevealed);
            for (const clue of visibleClues) {
                clue.data.isRevealed = true;
            }

            render(<CurrentQuestionWithProviders question={question} visibleClues={visibleClues} />);
            
            expect(screen.queryByText(/waiting for first clue/i)).not.toBeInTheDocument();
            let clueElements = screen.queryAllByText(/Clue: /i);
            expect(clueElements).toHaveLength(numRevealed);
            for (const {clue, index} of visibleClues.map((c, i) => ({clue:c, index:i}))) {
                expect(clueElements[index]).toHaveTextContent(clue.data.text);
            }
        });
    });

    describe('when the current question is a sequence-type question', () => {
        let question: CollectionQueryItem<SequenceQuestion>;
        let clues: Three<CollectionQueryItem<TextClue>>;
        beforeEach(() => {
            clues = [
                { id: 'c1', data: textClue({ text: 'Clue: ABC' }) },
                { id: 'c2', data: textClue({ text: 'Clue: DEF' }) },
                { id: 'c3', data: textClue({ text: 'Clue: GHI' }) },
            ];
            question = {
                id: questionId,
                data: {
                    type: 'sequence',
                    answerLimit: null,
                    isRevealed: false,
                    clueIds: clues.map(c => c.id) as Three<string>,
                },
            };
        });

        it.each([[1], [2]])('shows all %i revealed clues', (numRevealed) => {
            const visibleClues = clues.slice(0, numRevealed);
            for (const clue of visibleClues) {
                clue.data.isRevealed = true;
            }

            render(<CurrentQuestionWithProviders question={question} visibleClues={visibleClues} />);
            
            expect(screen.queryByText(/waiting for first clue/i)).not.toBeInTheDocument();
            let clueElements = screen.queryAllByText(/Clue: /i);
            expect(clueElements).toHaveLength(numRevealed);
            for (const {clue, index} of visibleClues.map((c, i) => ({clue:c, index:i}))) {
                expect(clueElements[index]).toHaveTextContent(clue.data.text);
            }
        });

        it('shows a question mark fourth clue when all three clues are revealed', () => {
            for (const clue of clues) {
                clue.data.isRevealed = true;
            }

            render(<CurrentQuestionWithProviders question={question} visibleClues={clues} />);
            
            expect(screen.queryByText(/waiting for first clue/i)).not.toBeInTheDocument();
            let clueElements = screen.queryAllByText(/Clue: /i);
            expect(clueElements).toHaveLength(3);
            for (const {clue, index} of clues.map((c, i) => ({clue:c, index:i}))) {
                expect(clueElements[index]).toHaveTextContent(clue.data.text);
            }
            expect(screen.getByText('?')).toBeInTheDocument();
        });
    });
});