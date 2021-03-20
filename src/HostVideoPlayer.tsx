import { Card } from './Card';
import { useQuizContext } from './contexts/quizPage';
import { YouTubePlayer } from './YouTubePlayer';

export const HostVideoPlayer = ({ isQuizOwner }: { isQuizOwner: boolean; }) => {
    const { quiz } = useQuizContext();
    if (!quiz.youTubeVideoId) {
        return null;
    }
    return (
        <Card>
            <YouTubePlayer youTubeVideoId={quiz.youTubeVideoId} muted={isQuizOwner} />
        </Card>
    )
};