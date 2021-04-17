import { useRef } from 'react';
import { useCluesContext } from './contexts/quizPage';
import { useAnimationTimer } from './hooks/useAnimationFrame';
import { CollectionQueryItem } from './hooks/useCollectionResult';
import { Question, Clue, getClueIds, Quiz } from './models';
import styles from './QuestionTimer.module.css';

const initialResetKeySentinal = {};
function useStartTime<T>(resetKey: T, predicate?: (resetKey: T, hasBeenSet: boolean) => boolean) {
    const startTimeRef = useRef(getCurrentTime());
    const hasBeenSetRef = useRef(false);
    const oldValue = useRef(initialResetKeySentinal as unknown as T);

    const resetKeyChanged = oldValue.current === initialResetKeySentinal || oldValue.current !== resetKey;
    if (resetKeyChanged && (!predicate || predicate(resetKey, hasBeenSetRef.current))) {
        startTimeRef.current = getCurrentTime();
        hasBeenSetRef.current = true;
        oldValue.current = resetKey;
    }

    return startTimeRef.current;
}

function useEndTime({ now, disable, pause }: { now: number; disable?: boolean; pause?: boolean; }) {
    const endTimeRef = useRef<number | null>(null);

    if (disable === true) {
        endTimeRef.current = null;
    } else if (pause !== true) {
        endTimeRef.current = now;
    }

    return endTimeRef;
}

function useIsQuestionClosed(currentQuestionItem?: CollectionQueryItem<Question>) {
    const { data: cluesData } = useCluesContext();
    let isQuestionClosed = null;
    if (currentQuestionItem && cluesData) {
        const clueIds = getClueIds(currentQuestionItem.data);
        const lastClueId = clueIds[clueIds.length - 1];
        const lastClue = cluesData.find((c) => c.id === lastClueId);
        if (lastClue) {
            isQuestionClosed = lastClue.data.closedAt === undefined;
        }
    }
    return isQuestionClosed;
}

interface QuestionTimerProps {
    currentQuestionItem?: CollectionQueryItem<Question>;
    currentClueItem?: CollectionQueryItem<Clue>;
    quiz: Quiz;
}
export const QuestionTimer = ({ currentQuestionItem, currentClueItem, quiz }: QuestionTimerProps) => {
    const isQuestionClosed = useIsQuestionClosed(currentQuestionItem);
    const time = useAnimationTimer(1000);
    const quizStartTime = useStartTime(currentQuestionItem, (item, hasBeenSet) => !hasBeenSet && item !== undefined);
    const questionStartTime = useStartTime(currentQuestionItem?.id);
    const clueStartTime = useStartTime(currentClueItem?.id);

    const quizEndTime = useEndTime({
        now: time,
        pause: quiz.isComplete,
    });
    const questionEndTime = useEndTime({
        now: time,
        disable: !currentQuestionItem || isQuestionClosed === null,
        pause: isQuestionClosed === false,
    });
    const clueEndTime = useEndTime({
        now: time,
        disable: !currentClueItem,
        pause: !!currentClueItem?.data.closedAt,
    });

    if (currentQuestionItem === undefined) {
        return (null);
    }

    const quizTimer = () => quizEndTime.current ?
        <TimerBlock title="Quiz" start={quizStartTime} time={quizEndTime.current} /> :
        null;
    const questionTimer = () => questionEndTime.current ?
        <TimerBlock title="Question" start={questionStartTime} time={questionEndTime.current} /> :
        null;
    const clueTimer = () => clueEndTime.current ?
        <TimerBlock title="Clue" start={clueStartTime} time={clueEndTime.current} /> :
        null;

    if (currentClueItem === undefined || !currentQuestionItem.data.isRevealed) {
        return (
            <div className={styles.timers}>
                {quizTimer()}
                {!quiz.isComplete && questionTimer()}
            </div>
        );
    } else {
        const clueIds = getClueIds(currentQuestionItem.data);
        const isLastClue = clueIds[clueIds.length - 1] === currentClueItem.id;
        const lastClueIsClosed = isLastClue && currentClueItem.data.closedAt !== undefined;
        if (lastClueIsClosed) {
            return (
                <div className={styles.timers}>
                    {quizTimer()}
                </div>
            );
        } else {
            const showClueTimer = clueIds.length > 1;
            return (
                <div className={styles.timers}>
                    {quizTimer()}
                    {questionTimer()}
                    {showClueTimer && clueTimer()}
                </div>
            );
        }
    }
};

const TimerBlock = ({ title, start, time }: { title: string; start: number; time: number }) => {
    const timeSinceChange = time - start;

    const roundedSeconds = Math.max(0, Math.round(timeSinceChange / 1000));

    const hours = Math.floor(roundedSeconds / 3600)
    const mins = Math.floor(roundedSeconds / 60) % 60;
    const secs = roundedSeconds % 60;

    return (
        <div className={styles.timerBlock}>
            <span className={styles.timerTitle}>{title}</span>
            <span className={styles.time}>{hours > 0 && pad(hours) + ':'}{pad(mins)}:{pad(secs)}</span>
        </div>
    );
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