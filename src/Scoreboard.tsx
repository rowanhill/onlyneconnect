import { Card } from './Card';
import { useQuizContext, useTeamsContext } from './contexts/quizPage';
import styles from './Scoreboard.module.css';

export const Scoreboard = () => {
    const { quizId } = useQuizContext();
    const { data: teamsData, loading, error } = useTeamsContext();
    if (error) {
        console.error(error);
        return <div><strong>There was an error loading the scoreboard! Please try again</strong></div>;
    }
    if (loading) {
        return <div></div>;
    }
    if (!teamsData) {
        console.error(`Teams data is undefined for quiz ${quizId}`);
        return <div><strong>There was an error loading the scoreboard! Please try again</strong></div>;
    }
    const teamsOrderedByScore = teamsData.sort((a, b) => b.data.points - a.data.points);
    return (
        <Card className={styles.scoreboard} data-cy="scoreboard">
            <h2>Scoreboard</h2>
            <ul>
                {teamsOrderedByScore.map((team) => (
                    <li key={team.id}>{team.data.name}: {team.data.points}</li>
                ))}
            </ul>
        </Card>
    );
};