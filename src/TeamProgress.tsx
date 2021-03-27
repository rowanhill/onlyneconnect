import { hasAttemptsRemaining } from './answerAttemptsCalculator';
import { Card } from './Card';
import { useAnswersContext, useTeamsContext, useWallInProgressContext } from './contexts/quizPage';
import { GenericErrorBoundary } from './GenericErrorBoundary';
import { CollectionQueryData, CollectionQueryItem } from './hooks/useCollectionResult';
import { Clue, FourByFourTextClue, Question, Team, throwBadQuestionType } from './models';
import styles from './TeamProgress.module.css';

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
        <Card title="Progress">
            <GenericErrorBoundary>
                <TeamProgressInner
                    currentQuestionItem={currentQuestionItem}
                    currentClueItem={currentClueItem}
                    teamsData={teamsData}
                />
            </GenericErrorBoundary>
        </Card>
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
        const progressByFoundGroups = [
            { numGroupsFound: 0, title: 'No groups', unfrozen: 0, frozen: 0 },
            { numGroupsFound: 1, title: 'One group', unfrozen: 0, frozen: 0 },
            { numGroupsFound: 2, title: 'Two groups', unfrozen: 0, frozen: 0 },
            { numGroupsFound: 3, title: 'Three groups', unfrozen: 0, frozen: 0 },
            { numGroupsFound: 4, title: 'Four groups', unfrozen: 0, frozen: 0 },
        ];
        let totalWithWip = 0;
        for (const team of teamsData) {
            const wip = wipByTeam[team.id];
            if (wip) {
                totalWithWip += 1;
                const numFoundGroups = wip.data.correctGroups?.length || 0;
                if (wip.data.remainingLives === 0) {
                    progressByFoundGroups[numFoundGroups].frozen = progressByFoundGroups[numFoundGroups].frozen + 1;
                } else {
                    progressByFoundGroups[numFoundGroups].unfrozen = progressByFoundGroups[numFoundGroups].unfrozen + 1;
                }
            }
        }
        // Include teams without a WIP as having zero found groups
        progressByFoundGroups[0].unfrozen = progressByFoundGroups[0].unfrozen + (teamsData.length - totalWithWip);

        return (
        <table className={styles.wallProgressTable}>
            <thead>
                <tr>
                    <th>Groups found</th>
                    <th>Teams (unfrozen)</th>
                    <th>Teams (frozen)</th>
                    <th>Teams (total)</th>
                </tr>
            </thead>
            <tbody>
            {progressByFoundGroups.map((row) =>
                <tr key={row.numGroupsFound}>
                    <th className={styles.rowLabel}>{row.title}</th>
                    <td>{row.unfrozen}</td>
                    <td>{row.frozen}</td>
                    <td>{row.frozen + row.unfrozen}</td>
                </tr>
            )}
            </tbody>
        </table>
        );
    } else {
        if (!answersResult.data) {
            return (<p>Answer data not loaded.</p>);
        }
        const questionAnswers = answersResult.data.filter((a) => a.data.questionId === clueItem.data.questionId);
        return (<p>There are {teamsData.length - questionAnswers.length} out of {teamsData.length} teams yet to submit an answer.</p>)
    }
};