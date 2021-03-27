import { render } from '@testing-library/react';
import { AnswersContext, TeamsContext, WallInProgressContext } from './contexts/quizPage';
import { CollectionQueryData, CollectionQueryItem } from './hooks/useCollectionResult';
import { Question, Clue, WallInProgress, Team, Answer, FourByFourTextClue } from './models';
import { TeamProgress } from './TeamProgress';

describe('<TeamProgress />', () => {
    interface RenderProps {
        currentQuestionItem?: CollectionQueryItem<Question>;
        currentClueItem?: CollectionQueryItem<Clue>;
        wipByTeamByClue?: {
            [clueId: string]: {
                [teamId: string]: CollectionQueryItem<WallInProgress>;
            };
        };
        teams?: CollectionQueryData<Team>,
        answers?: CollectionQueryData<Answer>,
    }
    let defaults: RenderProps;
    beforeEach(() => {
        defaults = {
            currentQuestionItem: { id: 'question-id', data: { type: 'connection', isRevealed: true } as Question },
            currentClueItem: { id: 'clue-id', data: { closedAt: undefined, answerLimit: 1, questionId: 'question-id' } as Clue },
            wipByTeamByClue: undefined,
            teams: [
                { id: 'team-1-id' } as CollectionQueryItem<Team>,
                { id: 'team-2-id' } as CollectionQueryItem<Team>,
                { id: 'team-3-id' } as CollectionQueryItem<Team>,
            ],
            answers: [],
        };
    });
    const TeamProgressWithContext = (overrides: Partial<RenderProps>) => {
        const props = { ...defaults, ...overrides };
        return (
            <AnswersContext.Provider value={{ data: props.answers, error: undefined, loading: false }}>
                <TeamsContext.Provider value={{ data: props.teams, error: undefined, loading: false }}>
                    <WallInProgressContext.Provider value={{ queryResult: undefined, wipByTeamByClue: props.wipByTeamByClue }}>
                        <TeamProgress currentQuestionItem={props.currentQuestionItem} currentClueItem={props.currentClueItem} />
                    </WallInProgressContext.Provider>
                </TeamsContext.Provider>
            </AnswersContext.Provider>
        );
    };

    it('does not render if there is no current question', () => {
        const { container } = render(<TeamProgressWithContext
            currentQuestionItem={undefined}
        />);
        expect(container.children.length).toEqual(0);
    });

    it('does not render if there is no current clue', () => {
        const { container } = render(<TeamProgressWithContext
            currentClueItem={undefined}
        />);
        expect(container.children.length).toEqual(0);
    });

    it('does not render if the current question is not revealed', () => {
        defaults.currentQuestionItem!.data.isRevealed = false;
        const { container } = render(<TeamProgressWithContext />);
        expect(container.children.length).toEqual(0);
    });

    it('does not render if the current clue is closed', () => {
        defaults.currentClueItem!.data.closedAt = 'dummy timestamp' as any;
        const { container } = render(<TeamProgressWithContext />);
        expect(container.children.length).toEqual(0);
    });

    it('does not render if the teams data is not loaded', () => {
        const { container } = render(<TeamProgressWithContext
            teams={undefined}
        />);
        expect(container.children.length).toEqual(0);
    });

    describe.each([['connection'], ['sequence']])('with %s type question', (type) => {
        beforeEach(() => {
            defaults.currentQuestionItem!.data.type = type as Question['type'];
        });

        it.each([[0], [1], [2], [3]])('renders the number of teams with attempts remaining when %i teams have submitted answers', (numAnsweringTeams) => {
            const answersData: CollectionQueryData<Answer> = [];
            for (let i = 1; i <= numAnsweringTeams; i++) {
                answersData.push({
                    id: `answer-${i}-id`,
                    data: {
                        clueId: defaults.currentClueItem!.id,
                        questionId: defaults.currentQuestionItem!.id,
                        teamId: `team-${i}-id`,
                    } as Answer,
                });
            }
            const { getByText } = render(<TeamProgressWithContext answers={answersData} />);

            expect(getByText(new RegExp(`${3 - numAnsweringTeams} out of 3 teams with attempts remaining`))).toBeVisible();
        });
    });

    describe('with missing-vowels type question', () => {
        beforeEach(() => {
            defaults.currentQuestionItem!.data.type = 'missing-vowels';
            defaults.currentQuestionItem!.data.answerLimit = 5;
            defaults.currentClueItem!.data.answerLimit = null;
        });

        describe.each([
            [0, 0], [1, 0], [2, 1], [3, 2], [3, 3]
        ])('when %i teams have submitted an answer and %i teams have no attempts remaining', (numSubmitted, numSubmittedAll) => {
            beforeEach(() => {
                const answersData: CollectionQueryData<Answer> = [];
                for (let i = 1; i <= numSubmitted; i++) {
                    answersData.push({
                        id: `answer-${i}-1-id`,
                        data: {
                            clueId: defaults.currentClueItem!.id,
                            questionId: defaults.currentQuestionItem!.id,
                            teamId: `team-${i}-id`,
                        } as Answer,
                    });
                    if (i <= numSubmittedAll) {
                        for (let j = 1; j < 5; j++) {
                            answersData.push({
                                id: `answer-${i}-${j+1}-id`,
                                data: {
                                    clueId: defaults.currentClueItem!.id,
                                    questionId: defaults.currentQuestionItem!.id,
                                    teamId: `team-${i}-id`,
                                } as Answer,
                            });
                        }
                    }
                }
                defaults.answers = answersData;
            });

            it('renders the number of teams who have not yet submitted and the number of teams with attempts remaining', () => {
                const { getByText } = render(<TeamProgressWithContext />);

                expect(getByText(new RegExp(`${3 - numSubmitted} out of 3 teams yet to guess, and ${3 - numSubmittedAll} out of 3 teams with attempts remaining`))).toBeVisible();
            });
        });
    });

    describe('with wall type question', () => {
        beforeEach(() => {
            defaults.currentQuestionItem!.data.type = 'wall';
            defaults.currentQuestionItem!.data.answerLimit = null;
            defaults.currentClueItem!.data.answerLimit = null;
        });

        describe('before the groups have been revealed', () => {
            beforeEach(() => {
                (defaults.currentClueItem!.data as FourByFourTextClue).solution = undefined;
                defaults.wipByTeamByClue = { 'clue-id': {} };
            });

            it.each([
                [0, 0, 0],
                [0, 1, 2],
                [1, 2, 4],
                [4, 4, 4],
            ])('displays a breakdown when teams have found %i, %i, %i groups respectively', (team1Groups, team2Groups, team3Groups) => {
                const expected = [0, 0, 0, 0, 0];
                let i = 1;
                for (const numGroups of [team1Groups, team2Groups, team3Groups]) {
                    const correctGroups = [] as Exclude<WallInProgress['correctGroups'], undefined>;
                    for (let j = 0; j < numGroups; j++) {
                        correctGroups.push(`dummy group ${j}` as any);
                    }
                    defaults.wipByTeamByClue!['clue-id'][`team-${i}-id`] = {
                        data: {
                            correctGroups
                        }
                    } as CollectionQueryItem<WallInProgress>;
                    expected[numGroups] = expected[numGroups] + 1;
                    i++;
                }
            
                const { getByText } = render(<TeamProgressWithContext />);
    
                expect(getByText(/Team breakdown by number of found groups \(0-4\):/)).toBeVisible();
                expect(getByText(new RegExp(`\\[${expected[0]}\\D*,\\D*${expected[1]}\\D*,\\D*${expected[2]}\\D*,\\D*${expected[3]}\\D*,\\D*${expected[4]}\\]`))).toBeVisible();
            });
    
            it.each([
                [0], [1], [2], [3]
            ])('displays the count of %i teams with frozen walls', (numFrozen) => {
                for (let i = 0; i < 3; i++) {
                    defaults.wipByTeamByClue!['clue-id'][`team-${i + 1}-id`] = {
                        data: {
                            remainingLives: i < numFrozen ? 0 : 3,
                        }
                    } as CollectionQueryItem<WallInProgress>;
                }
    
                const { getByText } = render(<TeamProgressWithContext />);
    
                expect(getByText(new RegExp(`There are ${numFrozen} teams with frozen walls out of 3 teams`))).toBeVisible();
            });
        });

        describe('after the groups have been revealed', () => {
            beforeEach(() => {
                (defaults.currentClueItem!.data as FourByFourTextClue).solution = 'dummy solution' as any;
                defaults.wipByTeamByClue = { 'clue-id': {} };
            });

            it.each([
                [0], [1], [2], [3]
            ])('displays %i teams yet to submit connections', (numTeamsToSubmit) => {
                const numTeamsSubmitted = 3 - numTeamsToSubmit;

                const answersData: CollectionQueryData<Answer> = [];
                for (let i = 1; i <= numTeamsSubmitted; i++) {
                    answersData.push({
                        id: `answer-${i}-id`,
                        data: {
                            clueId: defaults.currentClueItem!.id,
                            questionId: defaults.currentQuestionItem!.id,
                            teamId: `team-${i}-id`,
                        } as Answer,
                    });
                }

                const { getByText } = render(<TeamProgressWithContext answers={answersData} />);

                expect(getByText(new RegExp(`There are ${numTeamsToSubmit} out of 3 teams yet to submit an answer`))).toBeVisible();
            });
        });
    });
});