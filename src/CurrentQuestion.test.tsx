import { render, screen } from '@testing-library/react';
import React from 'react';
import { CluesContext, QuestionsContext, QuestionSecretsContext, QuizContext } from './contexts/quizPage';
import { CurrentQuestion } from './CurrentQuestion';
import { CollectionQueryItem, CollectionQueryResult } from './hooks/useCollectionResult';
import { Clue, CompoundTextClue, ConnectionQuestion, Four, MissingVowelsQuestion, Question, QuestionSecrets, Quiz, SequenceQuestion, SequenceSecrets, TextClue, Three } from './models';

describe('<CurrentQuestion>', () => {
    const questionId = 'q1';
    function textClue(options: Partial<TextClue> = {}): TextClue {
        return { answerLimit: 1, isRevealed: false, questionId, text: 'Clue text', type: 'text', ...options };
    }
    function compoundTextClue(options: Partial<CompoundTextClue>): CompoundTextClue {
        return { answerLimit: null, isRevealed: false, questionId, texts: ['1', '2', '3', '4'], type: 'compound-text', ...options };
    }

    interface CurrentQuestionWithProvidersProps {
        question: CollectionQueryItem<Question>;
        secret?: CollectionQueryItem<QuestionSecrets>;
        quiz?: Quiz;
        visibleClues: CollectionQueryItem<Clue>[];
    }
    function CurrentQuestionWithProviders({ question, secret, quiz, visibleClues }: CurrentQuestionWithProvidersProps) {
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
        const questionSecretsContext: CollectionQueryResult<QuestionSecrets> = {
            loading: false,
            error: undefined,
            data: secret ? [ secret ] : undefined,
        }
        const defaultedQuiz = quiz || { questionIds: question ? [question.id] : [] } as Quiz;
        return (
            <QuizContext.Provider value={{ quiz: defaultedQuiz, quizId: 'quizid' }}>
            <QuestionsContext.Provider value={questionContext}>
            <CluesContext.Provider value={cluesContext}>
            <QuestionSecretsContext.Provider value={questionSecretsContext}>
                <CurrentQuestion currentQuestionItem={question} />
            </QuestionSecretsContext.Provider>
            </CluesContext.Provider>
            </QuestionsContext.Provider>
            </QuizContext.Provider>
        );
    }

    it('shows a waiting message when there is no current question', () => {
        render(<CurrentQuestionWithProviders question={undefined as any} visibleClues={[]} />);
        expect(screen.queryByText(/waiting for quiz to start/i)).toBeInTheDocument();
    });

    it('shows a waiting message when no clues are revealed', () => {
        render(<CurrentQuestionWithProviders question={{ data: { type: 'connection' } } as any} visibleClues={[]} />);
        expect(screen.queryByText(/waiting for question to start/i)).toBeInTheDocument();
    });

    it('shows the question number as a title', () => {
        render(<CurrentQuestionWithProviders
            question={{ id: '123', data: { type: 'connection' } } as any}
            quiz={{ questionIds: ['abc', '123', '456']} as Quiz}
            visibleClues={[]}
        />);
        expect(screen.queryByText(/Question 2/i)).toBeInTheDocument();
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

        it('shows an instruction', () => {
            render(<CurrentQuestionWithProviders question={question} visibleClues={[]} />);
            expect(screen.queryByText(/Connection: what links these things\?/i)).toBeInTheDocument();
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

        it('shows an instruction', () => {
            render(<CurrentQuestionWithProviders question={question} visibleClues={[]} />);
            expect(screen.queryByText(/Sequence: what comes fourth\?/i)).toBeInTheDocument();
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

        it('shows the example fourth clue when the question is closed', () => {
            for (const clue of clues) {
                clue.data.isRevealed = true;
            }
            question.data.exampleLastInSequence = 'fourth'

            render(<CurrentQuestionWithProviders question={question} visibleClues={clues} />);

            expect(screen.getByText('fourth')).toBeInTheDocument();
        });

        describe('when the user is the quiz owner', () => {
            let secret: CollectionQueryItem<SequenceSecrets>;
            beforeEach(() => {
                secret = {
                    id: question.id,
                    data: {
                        type: question.data.type,
                        connection: 'Some connection',
                        exampleLastInSequence: 'fourth',
                    },
                };
            });

            it('shows the fourth clue in brackets before the question is cloesd', () => {
                for (const clue of clues) {
                    clue.data.isRevealed = true;
                }

                render(<CurrentQuestionWithProviders question={question} secret={secret} visibleClues={clues} />);

                expect(screen.getByText('(fourth)')).toBeInTheDocument();
            });

            it('shows the fourth clue without brackets when the question is closed', () => {
                for (const clue of clues) {
                    clue.data.isRevealed = true;
                }
                question.data.exampleLastInSequence = 'fourth'

                render(<CurrentQuestionWithProviders question={question} secret={secret} visibleClues={clues} />);

                expect(screen.getByText('fourth')).toBeInTheDocument();
            });
        });
    });

    describe('when the current question is a missing-vowels type question', () => {
        let clue: CollectionQueryItem<CompoundTextClue>;
        let question: CollectionQueryItem<MissingVowelsQuestion>;
        beforeEach(() => {
            clue = {
                id: 'c1', data: compoundTextClue({ texts: ['Clue: A', 'Clue: B', 'Clue: C', 'Clue: D']})
            };
            question = {
                id: questionId,
                data: {
                    type: 'missing-vowels',
                    answerLimit: null,
                    isRevealed: false,
                    clueId: clue.id,
                },
            };
        });

        it('shows an instruction', () => {
            render(<CurrentQuestionWithProviders question={question} visibleClues={[]} />);
            expect(screen.queryByText(/Missing vowels: what links these things\?/i)).toBeInTheDocument();
        });
    });
});