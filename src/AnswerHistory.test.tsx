import { render, screen, within } from '@testing-library/react';
import firebase from 'firebase/app';
import 'firebase/firestore';
import { ComponentProps } from 'react';
import { AnswersForQuestion } from './AnswerHistory';
import { Clue, MissingVowelsQuestion, Question, SimpleAnswer } from './models';

describe('<AnswersForQuestion>', () => {
    function time(s: number) {
        return new firebase.firestore.Timestamp(s, 0);
    }
    function renderWithProps() {
        render(<AnswersForQuestion {...props} />);
    }

    let props: ComponentProps<typeof AnswersForQuestion>;
    beforeEach(() => {
        props = {
            isQuizOwner: false,
            questionNumber: 2,
            question: { type: 'connection', clueIds: ['c1', 'c2', 'c3', 'c4'] } as Question,
            cluesById: {
                'c1': { id: 'c1', data: { revealedAt: time(100), closedAt: time(200) } as Clue },
                'c2': { id: 'c2', data: { revealedAt: time(300), closedAt: time(400) } as Clue },
                'c3': { id: 'c3', data: { revealedAt: time(500), closedAt: time(600) } as Clue },
                'c4': { id: 'c4', data: { revealedAt: time(700),                     } as Clue },
            },
            questionAnswers: [
                { id: 'a1', data: { submittedAt: time(150), teamId: 't1', clueId: 'c1', text: 'Answer one' } as SimpleAnswer },
                { id: 'a2', data: { submittedAt: time(170), teamId: 't2', clueId: 'c1', text: 'Answer two' } as SimpleAnswer },
                { id: 'a3', data: { submittedAt: time(750), teamId: 't3', clueId: 'c4', text: 'Answer three' } as SimpleAnswer },
            ],
            teamNamesById: {
                't1': 'Team One',
                't2': 'Team Two',
                't3': 'Team Three',
                't4': 'Team Four',
            },
            updateAnswerScoresAndCorrectFlags: jest.fn(),
        };
    });

    it('returns null if there are no questionAnswers', () => {
        const result = AnswersForQuestion({ questionAnswers: [] } as any);
        expect(result).toBeNull();
    });

    it('displays the question number', () => {
        renderWithProps();

        expect(screen.getByText(/Question 2/i)).toBeInTheDocument();
    });

    it('displays all the submitted answers as unscored', () => {
        renderWithProps();

        const el1 = screen.getByText(/Answer one \(unscored\)/i);
        expect(el1).toBeInTheDocument();
        expect(el1.parentElement).not.toHaveClass('invalidAnswer');
        const el2 = screen.getByText(/Answer two \(unscored\)/i);
        expect(el2).toBeInTheDocument();
        expect(el2.parentElement).not.toHaveClass('invalidAnswer');
        const el3 = screen.getByText(/Answer three \(unscored\)/i);
        expect(el3).toBeInTheDocument();
        expect(el3.parentElement).not.toHaveClass('invalidAnswer');
    });

    it('displays an answer\'s score once it is marked', () => {
        props.questionAnswers[0].data.correct = true;
        props.questionAnswers[0].data.points = 5;
        props.questionAnswers[1].data.correct = false;
        props.questionAnswers[1].data.points = 0;

        renderWithProps();

        expect(screen.getByText(/Answer one \(5\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Answer two \(0\)/i)).toBeInTheDocument();
    });

    it('displays an answer as invalid if it was submitted before the clue was revealed', () => {
        props.questionAnswers[0].data.submittedAt = time(90);

        renderWithProps();

        expect(screen.getByText(/Answer one/i).parentElement).toHaveClass('invalidAnswer');
    });

    it('displays an answer as invalid if it was submitted after the clue was closed', () => {
        props.questionAnswers[0].data.submittedAt = time(210);

        renderWithProps();

        expect(screen.getByText(/Answer one/i).parentElement).toHaveClass('invalidAnswer');
    });

    describe('for quiz owner', () => {
        beforeEach(() => {
            props.isQuizOwner = true;
        });

        const answerRow = (pattern: RegExp) => screen.getByText(pattern).parentElement!;
        const markCorrect = (row: HTMLElement) => within(row).queryByText(/✔️/);
        const markIncorrect = (row: HTMLElement) => within(row).queryByText(/❌/);
        const markingButtons = (pattern: RegExp) => {
            const row = answerRow(pattern);
            return [markCorrect(row), markIncorrect(row)];
        };

        it('displays the name of the team who submitted each answer', () => {
            renderWithProps();
    
            expect(within(answerRow(/Answer one/)).getByText(/Team One/)).toBeInTheDocument();
            expect(within(answerRow(/Answer two/)).getByText(/Team Two/)).toBeInTheDocument();
            expect(within(answerRow(/Answer three/)).getByText(/Team Three/)).toBeInTheDocument();
        });

        it('displays buttons to mark correct and incorrect, enabled to start with', () => {
            renderWithProps();
    
            const [correctButton, incorrectButton] = markingButtons(/Answer one/);
            expect(correctButton).toBeInTheDocument();
            expect(correctButton).not.toBeDisabled();
            expect(incorrectButton).toBeInTheDocument();
            expect(incorrectButton).not.toBeDisabled();
        });

        it('disables the mark correct button if already marked correct', () => {
            props.questionAnswers[0].data.correct = true;

            renderWithProps();

            const [correctButton, incorrectButton] = markingButtons(/Answer one/);
            expect(correctButton).toBeDisabled();
            expect(incorrectButton).not.toBeDisabled();
        });

        it('disables the mark incorrect button if already marked incorrect', () => {
            props.questionAnswers[0].data.correct = false;

            renderWithProps();

            const [correctButton, incorrectButton] = markingButtons(/Answer one/);
            expect(correctButton).not.toBeDisabled();
            expect(incorrectButton).toBeDisabled();
        });

        it('hides the mark correct/incorrect buttons if the team has already answered correctly', () => {
            props.questionAnswers[0].data.correct = true;
            props.questionAnswers[2].data.teamId = props.questionAnswers[0].data.teamId;

            renderWithProps();

            const [correctButton, incorrectButton] = markingButtons(/Answer three/);
            expect(correctButton).not.toBeInTheDocument();
            expect(incorrectButton).not.toBeInTheDocument();
        });

        describe('with a missing vowels question', () => {
            beforeEach(() => {
                props.question = {
                    type: 'missing-vowels',
                    clueId: 'c1'
                } as MissingVowelsQuestion;
                props.questionAnswers[2].data.clueId = 'c1';
                props.questionAnswers[2].data.submittedAt = time(180);
            });

            it('disables the mark correct button for everything but the first unmarked answer', () => {
                props.questionAnswers[1].data.correct = true;

                renderWithProps();

                const [c1] = markingButtons(/Answer one/);
                const [c2] = markingButtons(/Answer two/);
                const [c3] = markingButtons(/Answer three/);
                expect(c1).not.toBeDisabled(); // 1 is first unmarked, even though there are subsequent marked qs
                expect(c2).toBeDisabled(); // 2 is marked
                expect(c3).toBeDisabled(); // 3 cannot be marked yet, it's not first unmarked
            });

            it('ignores answers from teams with the correct answer when determining the first unmarked answer', () => {
                props.questionAnswers[0].data.correct = true;
                props.questionAnswers[1].data.teamId = props.questionAnswers[0].data.teamId;
                props.questionAnswers.push({ id: 'a4', data: { clueId: 'c1', submittedAt: time(190), text: 'Answer four', teamId: 't4' } as SimpleAnswer })

                renderWithProps();

                const [c1] = markingButtons(/Answer one/);
                const [c2] = markingButtons(/Answer two/);
                const [c3] = markingButtons(/Answer three/);
                const [c4] = markingButtons(/Answer four/);
                expect(c1).toBeDisabled(); // 1 is marked correct
                expect(c2).not.toBeInTheDocument(); // 2 is from same team as 1, so cannot be marked at all
                expect(c3).not.toBeDisabled(); // 3 is first unmarked, so can be marked
                expect(c4).toBeDisabled(); // 4 is not first unmarked, so cannot be marked yet
            });
        });
    });
});