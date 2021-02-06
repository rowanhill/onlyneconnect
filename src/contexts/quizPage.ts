import { createContext, useContext } from 'react';
import { CollectionQueryItem, CollectionQueryResult } from '../hooks/useCollectionResult';
import { Answer, Clue, Question, Quiz, Team, WallInProgress } from '../models';

export const QuizContext = createContext<{ quizId: string; quiz: Quiz; }>(undefined as any);
export const useQuizContext = () => {
    const result = useContext(QuizContext);
    if (!result) {
        throw new Error('No value found in QuizContext. Is there a provider?');
    }
    return result;
};

export const QuestionsContext = createContext<CollectionQueryResult<Question>>(undefined as any);
export const useQuestionsContext = () => {
    const result = useContext(QuestionsContext);
    if (!result) {
        throw new Error('No value found in QuestionsContext. Is there a provider?');
    }
    return result;
};

export const CluesContext = createContext<CollectionQueryResult<Clue>>(undefined as any);
export const useCluesContext = () => {
    const result = useContext(CluesContext);
    if (!result) {
        throw new Error('No value found in CluesContext. Is there a provider?');
    }
    return result;
};

export const PlayerTeamContext = createContext<{ teamId: string|undefined; isCaptain: boolean|undefined; }>(undefined as any);
export const usePlayerTeamContext = () => {
    const result = useContext(PlayerTeamContext);
    if (!result) {
        throw new Error('No value found in PlayerTeamContext. Is there a provider?');
    }
    return result;
};

export const TeamsContext = createContext<CollectionQueryResult<Team>>(undefined as any);
export const useTeamsContext = () => {
    const result = useContext(TeamsContext);
    if (!result) {
        throw new Error('No value found in TeamsContext. Is there a provider?');
    }
    return result;
};

export const AnswersContext = createContext<CollectionQueryResult<Answer>>(undefined as any);
export const useAnswersContext = () => {
    const result = useContext(AnswersContext);
    if (!result) {
        throw new Error('No value found in AnswersContext. Is there a provider?');
    }
    return result;
};

interface WallInProgressContextValue {
    queryResult: CollectionQueryResult<WallInProgress> | undefined;
    wipByTeamByClue: {
        [clueId: string]: {
            [teamId: string]: CollectionQueryItem<WallInProgress>;
        };
    } | undefined;
}
export const WallInProgressContext = createContext<WallInProgressContextValue>(undefined as any);
export const useWallInProgressContext = () => {
    const result = useContext(WallInProgressContext);
    if (!result) {
        throw new Error('No value found in WallInProgressContext. Is there a provider?');
    }
    return result;
};
