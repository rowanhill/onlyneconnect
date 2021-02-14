import { render, screen } from '@testing-library/react';
import React from 'react';
import { PlayerTeamContext, QuizContext, WallInProgressContext } from './contexts/quizPage';
import { CollectionQueryItem } from './hooks/useCollectionResult';
import { FourByFourTextClue, WallInProgress } from './models';
import * as wallInProgress from './models/wallInProgress';
import { WallClues } from './WallClues';

describe('<WallClues>', () => {
    const defaultQuizId = 'quiz-id';
    const defaultTeamId = 'team-id';
    const defaultClueId = 'clue-id';
    const defaultQuestionId = 'question-id';
    const defaultClue = {
        id: defaultClueId,
        data: {
            isRevealed: true,
            questionId: defaultQuestionId,
            texts: [
                '1A', '1B', '1C', '1D',
                '2A', '2B', '2C', '2D',
                '3A', '3B', '3C', '3D',
                '4A', '4B', '4C', '4D',
            ],
        } as FourByFourTextClue,
    };
    interface WallCluesWithProvidersProps {
        quizId?: string;
        teamId?: string;
        isCaptain?: boolean;
        wipByTeamByClue?: {
            [clueId: string]: {
                [teamId: string]: CollectionQueryItem<WallInProgress>;
            };
        };
        clue?: CollectionQueryItem<FourByFourTextClue>;
    }
    function WallCluesWithProviders({ quizId, teamId, isCaptain, wipByTeamByClue, clue }: WallCluesWithProvidersProps) {
        return (
            <QuizContext.Provider value={{ quizId: quizId || defaultQuizId, quiz: null as any }}>
            <PlayerTeamContext.Provider value={{ teamId: teamId || defaultTeamId, isCaptain: isCaptain || false }}>
            <WallInProgressContext.Provider value={{ wipByTeamByClue: wipByTeamByClue || {}, queryResult: null as any }}>
                <WallClues clue={clue || defaultClue} />
            </WallInProgressContext.Provider>
            </PlayerTeamContext.Provider>
            </QuizContext.Provider>
        )
    }

    beforeEach(() => {
        jest.spyOn(wallInProgress, 'createWallInProgress');
    });

    it('renders all texts as clues in the wall', () => {
        render(<WallCluesWithProviders />);
        
        for (const text of defaultClue.data.texts) {
            expect(screen.queryByText(text)).toBeInTheDocument();
        }
    });

    it('creates a WallInProgress if renders as team captain without an existing WallInProgress', () => {
        render(<WallCluesWithProviders isCaptain={true} />);

        expect(wallInProgress.createWallInProgress).toHaveBeenCalledWith(defaultQuizId, defaultQuestionId, defaultClueId, defaultTeamId);
    });

    it('creates a WallInProgress once only even if the component rerenders', () => {
        const { rerender } = render(<WallCluesWithProviders isCaptain={true} />);
        rerender(<WallCluesWithProviders isCaptain={true} />);

        expect(wallInProgress.createWallInProgress).toHaveBeenCalledTimes(1);
    });
});