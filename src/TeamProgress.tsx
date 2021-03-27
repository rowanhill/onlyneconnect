import { hasAttemptsRemaining } from './answerAttemptsCalculator';
import { Card } from './Card';
import { useAnswersContext, useTeamsContext, useWallInProgressContext } from './contexts/quizPage';
import { GenericErrorBoundary } from './GenericErrorBoundary';
import { CollectionQueryData, CollectionQueryItem } from './hooks/useCollectionResult';
import { Clue, FourByFourTextClue, Question, Team, throwBadQuestionType } from './models';

interface TeamProgressProps {
    currentQuestionItem?: CollectionQueryItem<Question>;
    currentClueItem?: CollectionQueryItem<Clue>;
}

export const TeamProgress = ({ currentQuestionItem, currentClueItem }: TeamProgressProps) => {
    const { data: teamsData } = useTeamsContext();

    if (!teamsData) {
        return null;
    }

    if (currentQuestionItem === undefined || currentClueItem === undefined) {
        return null;
    }

    if (!currentQuestionItem.data.isRevealed) {
        return null;
    }

    if (currentClueItem.data.closedAt !== undefined) {
        return null;
    }

    return (
        <GenericErrorBoundary>
            <Card>
                <TeamProgressInner
                    currentQuestionItem={currentQuestionItem}
                    currentClueItem={currentClueItem}
                    teamsData={teamsData}
                />
            </Card>
        </GenericErrorBoundary>
    );
};

interface TeamProgressInnerProps {
    currentQuestionItem: CollectionQueryItem<Question>;
    currentClueItem: CollectionQueryItem<Clue>;
    teamsData: CollectionQueryData<Team>;
}
const TeamProgressInner = ({ currentQuestionItem, currentClueItem, teamsData }: TeamProgressInnerProps) => {
    switch (currentQuestionItem.data.type) {
        case 'connection':
        case 'sequence':
            return (<TeamProgressOneAttemptPerClue
                currentQuestionItem={currentQuestionItem}
                currentClueItem={currentClueItem}
                teamsData={teamsData}
            />);
        case 'missing-vowels':
            return (<TeamProgressManyAttemptsPerQuestion
                currentQuestionItem={currentQuestionItem}
                currentClueItem={currentClueItem}
                teamsData={teamsData}
            />);
        case 'wall':
            return (<TeamProgressWall
                clueItem={currentClueItem as CollectionQueryItem<FourByFourTextClue>}
                teamsData={teamsData}
            />);
        default:
            throwBadQuestionType(currentQuestionItem.data);
    }
};

const TeamProgressOneAttemptPerClue = ({ currentQuestionItem, currentClueItem, teamsData }: TeamProgressInnerProps) => {
    const answersResult = useAnswersContext();

    const numTeamsWithAttemptsRemaining = teamsData.filter((team) => 
        hasAttemptsRemaining(currentClueItem, currentQuestionItem, answersResult, team.id)).length;
    const numTeams = teamsData.length;

    return (<p>There are {numTeamsWithAttemptsRemaining} out of {numTeams} teams with attempts remaining.</p>);
};

const TeamProgressManyAttemptsPerQuestion = ({ currentQuestionItem, currentClueItem, teamsData }: TeamProgressInnerProps) => {
    const answersResult = useAnswersContext();

    if (!answersResult.data) {
        return (<p>Answer data not loaded.</p>);
    }

    const questionAnswers = answersResult.data.filter((a) => a.data.questionId === currentQuestionItem.id);

    const numTeams = teamsData.length;
    const numTeamsWithAnswers = teamsData.filter((team) => questionAnswers.some((a) => a.data.teamId === team.id)).length;
    const numTeamsWithoutAnswers = numTeams - numTeamsWithAnswers;
    const numTeamsWithAttemptsRemaining = teamsData.filter((team) => 
        hasAttemptsRemaining(currentClueItem, currentQuestionItem, answersResult, team.id)).length;

    return (<p>There are {numTeamsWithoutAnswers} out of {numTeams} teams yet to guess, and {numTeamsWithAttemptsRemaining} out of {numTeams} teams with attempts remaining.</p>);
};

const TeamProgressWall = ({ clueItem, teamsData }: { clueItem: CollectionQueryItem<FourByFourTextClue>; teamsData: CollectionQueryData<Team>; }) => {
    const { wipByTeamByClue } = useWallInProgressContext();
    const answersResult = useAnswersContext();

    if (!wipByTeamByClue) {
        return (<p>In-progress wall data not loaded.</p>);
    }

    if (clueItem.data.solution === undefined) {
        const wipByTeam = wipByTeamByClue[clueItem.id];
        if (!wipByTeam) {
            return (<p>No in-progress wall data for this question.</p>);
        }
        const countsForFoundGroups = [0, 0, 0, 0, 0];
        let frozenCount = 0;
        for (const team of teamsData) {
            const wip = wipByTeam[team.id];
            if (wip) {
                const numFoundGroups = wip.data.correctGroups?.length || 0;
                countsForFoundGroups[numFoundGroups] = countsForFoundGroups[numFoundGroups] + 1;
                if (wip.data.remainingLives === 0) {
                    frozenCount++;
                }
            }
        }
        // Include teams without a WIP as having zero found groups
        countsForFoundGroups[0] = teamsData.length - countsForFoundGroups[1] - countsForFoundGroups[2] - countsForFoundGroups[3] - countsForFoundGroups[4];

        return (<p>
            Team breakdown by number of found groups (0-4):
            [{countsForFoundGroups[0]}, {countsForFoundGroups[1]},
            {countsForFoundGroups[2]}, {countsForFoundGroups[3]}, {countsForFoundGroups[4]}].
            There are {frozenCount} teams with frozen walls out of {teamsData.length} teams.
        </p>);
    } else {
        if (!answersResult.data) {
            return (<p>Answer data not loaded.</p>);
        }
        const questionAnswers = answersResult.data.filter((a) => a.data.questionId === clueItem.data.questionId);
        return (<p>There are {teamsData.length - questionAnswers.length} out of {teamsData.length} teams yet to submit an answer.</p>)
    }
};