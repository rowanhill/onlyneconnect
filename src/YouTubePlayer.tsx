import styles from './YouTubePlayer.module.css';

export const YouTubePlayer = ({ youTubeVideoId, muted }: { youTubeVideoId: string; muted: boolean; }) => {
    const params = [
        'autoplay=1',
        'controls=0',
        'modestbranding=1',
        'rel=0',
        'playsinline=1',
    ];
    if (muted) {
        params.push('mute=1');
    }
    const url = `https://www.youtube.com/embed/${youTubeVideoId}?${params.join('&')}`;
    return (
        <div className={styles.sixteenToNineContainer}>
            <iframe
                src={url}
                title="QuizMaster video stream"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            ></iframe>
        </div>
    );
};