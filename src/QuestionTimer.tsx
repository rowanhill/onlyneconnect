import { useEffect, useRef } from 'react';
import { useAnimationTimer } from './hooks/useAnimationFrame';
import { CollectionQueryItem } from './hooks/useCollectionResult';
import { Question, Clue, getClueIds } from './models';
import styles from './QuestionTimer.module.css';

function useStartTime<T>(resetKey: T, predicate?: (resetKey: T, hasBeenSet: boolean) => boolean) {
    const startTimeRef = useRef(getCurrentTime());
    const hasBeenSetRef = useRef(false);
    useEffect(() => {
        if (!predicate || predicate(resetKey, hasBeenSetRef.current)) {
            startTimeRef.current = getCurrentTime();
            hasBeenSetRef.current = true;
        }
    }, [resetKey, predicate]);

    return startTimeRef.current;
}

interface QuestionTimerProps {
    currentQuestionItem?: CollectionQueryItem<Question>;
    currentClueItem?: CollectionQueryItem<Clue>;
}
export const QuestionTimer = ({ currentQuestionItem, currentClueItem }: QuestionTimerProps) => {
    const time = useAnimationTimer(1000);
    const quizStartTime = useStartTime(currentQuestionItem, (item, hasBeenSet) => !hasBeenSet && item !== undefined);
    const questionStartTime = useStartTime(currentQuestionItem?.id);
    const clueStartTime = useStartTime(currentClueItem?.id);

    if (currentQuestionItem === undefined) {
        return (null);
    }
    if (currentClueItem === undefined || !currentQuestionItem.data.isRevealed) {
        return (
            <div>
                Quiz: <TimeSince start={quizStartTime} now={time}/>{' '}
                Question: <TimeSince start={questionStartTime} now={time} />
            </div>
        );
    } else {
        const clueIds = getClueIds(currentQuestionItem.data);
        const isLastClue = clueIds[clueIds.length - 1] === currentClueItem.id;
        const lastClueIsClosed = isLastClue && currentClueItem.data.closedAt !== undefined;
        if (lastClueIsClosed) {
            return (<div>Quiz: <TimeSince start={quizStartTime} now={time} /></div>);
        } else {
            const showClueTimer = clueIds.length > 1;
            return (
                <div>
                    Quiz: <TimeSince start={quizStartTime} now={time} />{' '}
                    Question: <TimeSince start={questionStartTime} now={time} />
                    {showClueTimer && <>{' '}Clue: <TimeSince start={clueStartTime} now={time} /></>}
                </div>
            );
        }
    }
};

const TimeSince = ({ start, now }: { start: number; now: number; }) => {
    const timeSinceChange = now - start;
    return <MinsSecs millis={timeSinceChange} />;
};

const MinsSecs = ({ millis }: { millis: number; }) => {
    const roundedSeconds = Math.max(0, Math.round(millis / 1000));

    const mins = Math.floor(roundedSeconds / 60);
    const secs = roundedSeconds % 60;

    return <span className={styles.time}>{pad(mins)}:{pad(secs)}</span>;
};

function getCurrentTime(): number {
    return document.timeline?.currentTime || performance.now();
}

function pad(num: number): string {
    if (num < 10) {
        return `0${num}`;
    } else {
        return num.toString(10);
    }
}