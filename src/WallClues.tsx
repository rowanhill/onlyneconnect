import React from 'react';
import { VisibleClue } from './Clues';
import { CollectionQueryItem } from './hooks/useCollectionResult';
import { FourByFourTextClue } from './models';
import styles from './WallClues.module.css';

export const WallClues = ({ clue }: { clue: CollectionQueryItem<FourByFourTextClue>}) => {
    return (
        <div className={styles.wallGrid}>
            {clue.data.texts.map((text, i) =>
                <VisibleClue
                    key={i}
                    className={styles.wallClue + ' ' + styles[`col${(i % 4) + 1}`] + ' ' + styles[`row${Math.floor((i / 4) + 1)}`]}
                    isClickable={true}
                    isRevealed={clue.data.isRevealed}
                    text={text}
                    index={i}
                />
            )}
        </div>
    )
};