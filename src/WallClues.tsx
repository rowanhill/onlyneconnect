import React, { useEffect, useState } from 'react';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { VisibleClue } from './Clues';
import { CollectionQueryItem } from './hooks/useCollectionResult';
import firebase from './firebase';
import { FourByFourTextClue, WallInProgress } from './models';
import styles from './WallClues.module.css';
import { useQuizContext, usePlayerTeamContext } from './contexts/quizPage';

export const WallClues = ({ clue }: { clue: CollectionQueryItem<FourByFourTextClue>; }) => {
    const { quizId } = useQuizContext();
    const { teamId, isCaptain } = usePlayerTeamContext();
    const db = firebase.firestore();
    const progressDoc = teamId ? db.doc(`quizzes/${quizId}/clues/${clue.id}/wallInProgress/${teamId}`) : null;
    const [progressData, progressLoading, progressError] = useDocumentData<WallInProgress>(progressDoc);

    const [hasCreated, setHasCreated] = useState(false);
    useEffect(() => {
        console.log(progressDoc, progressLoading, progressData, hasCreated);
        if (progressDoc && progressLoading === false && !progressData && hasCreated === false) {
            progressDoc.set({
                selectedIndexes: [],
            });
            setHasCreated(true);
            console.log('Created in-progress doc');
        }
    }, [progressDoc, progressData, progressLoading, hasCreated, setHasCreated]);

    if (progressError) {
        console.error(`Error when fetching wall-in-progress data for clue ${clue.id} team ${teamId}`, progressError);
    }

    const toggleClue = (i: number) => {
        if (!isCaptain || !progressDoc || !progressData || progressData.selectedIndexes.length >= 4) {
            return;
        }
        if (progressData.selectedIndexes.includes(i)) {
            progressDoc.update({
                selectedIndexes: progressData.selectedIndexes.filter((index) => index !== i),
            });
        } else {
            const newIndexes = [...progressData.selectedIndexes, i];
            progressDoc.update({
                selectedIndexes: newIndexes,
            });

            if (newIndexes.length >= 4) {
                // TODO: Submit answers to server function for marking
                setTimeout(() => {
                    progressDoc.update({
                        selectedIndexes: [],
                    });
                }, 300);
            }
        }
    };

    const getClassNames = (i: number) => {
        const names = [];
        if (isCaptain) {
            names.push(styles.clickable);
        }
        if (progressData && progressData.selectedIndexes.includes(i)) {
            names.push(styles.selected);
        } else {
            names.push(styles.unselected);
        }
        names.push(styles[`col${(i % 4) + 1}`]);
        names.push(styles[`row${Math.floor((i / 4) + 1)}`]);
        return names.join(' ');
    }
    return (
        <div className={styles.wallGrid}>
            {clue.data.texts.map((text, i) =>
                <VisibleClue
                    key={i}
                    className={getClassNames(i)}
                    onClick={() => toggleClue(i)}
                    isRevealed={clue.data.isRevealed}
                    text={text}
                    index={i}
                />
            )}
        </div>
    )
};