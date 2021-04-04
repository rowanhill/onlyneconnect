import { render, screen, within } from '@testing-library/react';
import 'firebase/firestore';
import { ComponentProps } from 'react';
import { QuestionGroup } from './AnswerHistory';

describe('<QuestionGroup>', () => {
    function renderWithProps() {
        render(<QuestionGroup {...props} />);
    }

    let props: ComponentProps<typeof QuestionGroup>;
    beforeEach(() => {
        props = {
            isQuizOwner: false,
            questionNumber: 2,
            model: {
                id: 'q1',
                clueGroups: [
                    {
                        id: 'c1',
                        answerGroups: [
                            {
                                id: 'a1',
                                answers: [{ text: 'Answer one' }],
                                isValid: true,
                                type: 'simple',
                            },
                            {
                                id: 'a2',
                                answers: [{ text: 'Answer two' }],
                                isValid: true,
                                type: 'simple',
                            },
                        ],
                        numAnswers: 2,
                    },
                    {
                        id: 'c3',
                        answerGroups: [
                            {
                                id: 'a3',
                                answers: [{ text: 'Answer three' }],
                                isValid: true,
                                type: 'simple',
                            },
                        ],
                        numAnswers: 1,
                    },
                ],
                numAnswers: 3
            },
            setFocusAnswerRefIfFocusAnswerId: jest.fn(),
        };
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
        props.model.clueGroups[0].answerGroups[0].answers[0].points = 5;
        props.model.clueGroups[0].answerGroups[1].answers[0].points = 0;

        renderWithProps();

        expect(screen.getByText(/Answer one \(5\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Answer two \(0\)/i)).toBeInTheDocument();
    });

    it('displays an answer as invalid if it part of an invalid answer group', () => {
        props.model.clueGroups[0].answerGroups[0].isValid = false;

        renderWithProps();

        expect(screen.getByText(/Answer one/i).parentElement).toHaveClass('invalidAnswer');
    });

    describe('for quiz owner', () => {
        beforeEach(() => {
            props.isQuizOwner = true;
            props.model.clueGroups[0].answerGroups[0].answers[0].marking = {
                supercededByCorrectAnswer: false,
                canBeMarkedCorrect: true,
                canBeMarkedIncorrect: true,
                markCorrect: jest.fn(),
                markIncorrect: jest.fn(),
            };
            props.model.clueGroups[0].answerGroups[1].answers[0].marking = {
                supercededByCorrectAnswer: false,
                canBeMarkedCorrect: true,
                canBeMarkedIncorrect: true,
                markCorrect: jest.fn(),
                markIncorrect: jest.fn(),
            };
            props.model.clueGroups[1].answerGroups[0].answers[0].marking = {
                supercededByCorrectAnswer: false,
                canBeMarkedCorrect: true,
                canBeMarkedIncorrect: true,
                markCorrect: jest.fn(),
                markIncorrect: jest.fn(),
            };
        });

        const answerRow = (pattern: RegExp) => screen.getByText(pattern).parentElement!;
        const markCorrect = (row: HTMLElement) => within(row).queryByText(/✔️/);
        const markIncorrect = (row: HTMLElement) => within(row).queryByText(/❌/);
        const markingButtons = (pattern: RegExp) => {
            const row = answerRow(pattern);
            return [markCorrect(row), markIncorrect(row)];
        };

        it('displays the name of the team who submitted each answer', () => {
            props.model.clueGroups[0].answerGroups[0].teamName = 'Team One';
            props.model.clueGroups[0].answerGroups[1].teamName = 'Team Two';
            props.model.clueGroups[1].answerGroups[0].teamName = 'Team Three';

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

        it('disables the mark correct button if needed', () => {
            props.model.clueGroups[0].answerGroups[0].answers[0].marking!.canBeMarkedCorrect = false;

            renderWithProps();

            const [correctButton, incorrectButton] = markingButtons(/Answer one/);
            expect(correctButton).toBeDisabled();
            expect(incorrectButton).not.toBeDisabled();
        });

        it('disables the mark incorrect button if needed', () => {
            props.model.clueGroups[0].answerGroups[0].answers[0].marking!.canBeMarkedIncorrect = false;

            renderWithProps();

            const [correctButton, incorrectButton] = markingButtons(/Answer one/);
            expect(correctButton).not.toBeDisabled();
            expect(incorrectButton).toBeDisabled();
        });

        it('hides the mark correct/incorrect buttons if the team has already answered correctly', () => {
            props.model.clueGroups[1].answerGroups[0].answers[0].marking!.supercededByCorrectAnswer = true;

            renderWithProps();

            const [correctButton, incorrectButton] = markingButtons(/Answer three/);
            expect(correctButton).not.toBeInTheDocument();
            expect(incorrectButton).not.toBeInTheDocument();
        });
    });
});