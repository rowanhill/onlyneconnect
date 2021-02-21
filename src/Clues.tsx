import React from 'react';
import styles from './Clues.module.css';

export const VisibleClue = ({ isRevealed, text, index, className, onClick }: {
    isRevealed: boolean;
    text: string;
    index: number;
    className?: string;
    onClick?: () => void;
}) => {
    const cn = className || styles.connectionOrSequenceClue;
    return isRevealed ?
        <RevealedClue text={text} index={index} className={cn} onClick={onClick} /> :
        <UnrevealedClue text={text} index={index} className={cn} />;
};

const RevealedClue = ({ text, index, className, onClick }: {
    text: string;
    index: number;
    className?: string;
    onClick?: () => void;
}) => {
    const classNames = [styles.revealedClue];
    if(className) {
        classNames.push(className);
    }
    return (
        <div
            className={classNames.join(' ')}
            data-cy={`revealed-clue-${index}`}
            onClick={onClick}
        >
            {text}
        </div>
    );
};

const UnrevealedClue = ({ text, index, className }: { text: string; index: number; className?: string; }) => {
    return (
        <div
            className={(styles.unrevealedClue) + (className ? ` ${className}` : '')}
            data-cy={`unrevealed-clue-${index}`}
        >
            ({text})
        </div>
    );
};

export const LastInSequenceClue = ({ allOtherCluesRevealed, example, exampleFromSecret }: { allOtherCluesRevealed: boolean; example?: string; exampleFromSecret?: string; }) => {
    const cns = [];
    if (allOtherCluesRevealed) {
        cns.push(styles.revealedClue);
    } else {
        cns.push(styles.unrevealedClue);
    }
    cns.push(styles.connectionOrSequenceClue);
    const defaultedExample = example || exampleFromSecret || '?';
    const text = (example || !exampleFromSecret) ? defaultedExample : `(${defaultedExample})`;
    return (
        <div className={cns.join(' ')} data-cy={'last-clue'}>{text}</div>
    );
};

export const HiddenClue = () => {
    return (
        <div className={styles.hiddenClue + ' ' + styles.connectionOrSequenceClue}></div>
    );
};