import React, { useEffect, useState } from 'react';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { VisibleClue } from './Clues';
import { CollectionQueryItem } from './hooks/useCollectionResult';
import firebase from './firebase';
import './firebase-functions';
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
        if (progressDoc && progressLoading === false && !progressData && hasCreated === false) {
            progressDoc.set({
                selectedIndexes: [],
            });
            setHasCreated(true);
        }
    }, [progressDoc, progressData, progressLoading, hasCreated, setHasCreated]);

    if (progressError) {
        console.error(`Error when fetching wall-in-progress data for clue ${clue.id} team ${teamId}`, progressError);
    }

    const toggleClue = (i: number) => {
        if (!isCaptain || !progressDoc || !progressData ||
            progressData.selectedIndexes.length >= 4 ||
            (progressData.remainingLives !== undefined && progressData.remainingLives <= 0)
        ) {
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
                const checkIfWallGroupIsInSolution = firebase.functions().httpsCallable('checkIfWallGroupIsInSolution');
                checkIfWallGroupIsInSolution({ quizId, clueId: clue.id, teamId, indexes: newIndexes })
                    .then((result) => console.log(result.data));
            }
        }
    };

    const getUngroupedClassNames = (textIndex: number, gridIndex: number) => {
        const names = [];
        if (isCaptain && progressData && (progressData.remainingLives === undefined || progressData.remainingLives > 0)) {
            names.push(styles.clickable);
        }
        if (progressData && progressData.selectedIndexes.includes(textIndex)) {
            names.push(styles.selected);
        } else {
            names.push(styles.unselected);
        }
        names.push(styles[`col${(gridIndex % 4) + 1}`]);
        names.push(styles[`row${Math.floor((gridIndex / 4) + 1)}`]);
        return names.join(' ');
    };
    const getGroupedClassNames = (groupIndex: number, gridIndex: number) => {
        const names = [];
        names.push(styles[`group${groupIndex + 1}`]);
        names.push(styles[`col${(gridIndex % 4) + 1}`]);
        names.push(styles[`row${Math.floor((gridIndex / 4) + 1)}`]);
        return names.join(' ');
    };

    const correctGroups = progressData?.correctGroups || [];
    const groupedIndexes = correctGroups.flatMap((group) => group.indexes);

    const clueMetas: Array<{ foundGroupIndex: number|null; textIndex: number; text: string }> = [];
    correctGroups.forEach(({ indexes }, groupIndex) => {
        for (const textIndex of indexes) {
            clueMetas.push({ foundGroupIndex: groupIndex, textIndex, text: clue.data.texts[textIndex] });
        }
    });
    clue.data.texts.forEach((text, textIndex) => {
        if (groupedIndexes.indexOf(textIndex) === -1) {
            clueMetas.push({ foundGroupIndex: null, textIndex, text });
        }
    });

    return (
        <>
        <div className={styles.wallGrid}>
            {clueMetas.map((clueMeta, gridIndex) =>
                clueMeta.foundGroupIndex === null ?
                    <VisibleClue
                        key={clueMeta.textIndex}
                        className={getUngroupedClassNames(clueMeta.textIndex, gridIndex)}
                        onClick={() => toggleClue(clueMeta.textIndex)}
                        isRevealed={clue.data.isRevealed}
                        text={clueMeta.text}
                        index={gridIndex}
                    /> :
                    <VisibleClue
                        key={clueMeta.textIndex}
                        className={getGroupedClassNames(clueMeta.foundGroupIndex, gridIndex)}
                        isRevealed={clue.data.isRevealed}
                        text={clueMeta.text}
                        index={gridIndex}
                    />
            )}
        </div>
        {progressData?.remainingLives !== undefined && 
            <h4>
                Tries remaining:{' '}
                {progressData.remainingLives === 0 && 'none! The wall is frozen.'}
                {progressData.remainingLives === 1 && '💙'}
                {progressData.remainingLives === 2 && '💙💙'}
                {progressData.remainingLives >= 3 && '💙💙💙'}
            </h4>
        }
        </>
    );
};