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
                selectedTexts: [],
            });
            setHasCreated(true);
        }
    }, [progressDoc, progressData, progressLoading, hasCreated, setHasCreated]);

    if (progressError) {
        console.error(`Error when fetching wall-in-progress data for clue ${clue.id} team ${teamId}`, progressError);
    }

    const toggleClue = (text: string) => {
        if (!isCaptain || !progressDoc || !progressData ||
            progressData.selectedTexts.length >= 4 ||
            (progressData.remainingLives !== undefined && progressData.remainingLives <= 0)
        ) {
            return;
        }
        if (progressData.selectedTexts.includes(text)) {
            progressDoc.update({
                selectedTexts: progressData.selectedTexts.filter((selectedText) => selectedText !== text),
            });
        } else {
            const newTexts = [...progressData.selectedTexts, text];
            progressDoc.update({
                selectedTexts: newTexts,
            });

            if (newTexts.length >= 4) {
                const checkIfWallGroupIsInSolution = firebase.functions().httpsCallable('checkIfWallGroupIsInSolution');
                checkIfWallGroupIsInSolution({ quizId, clueId: clue.id, teamId, texts: newTexts })
                    .then((result) => console.log(result.data));
            }
        }
    };

    const getUngroupedClassNames = (text: string, gridIndex: number) => {
        const names = [];
        if (isCaptain && progressData && (progressData.remainingLives === undefined || progressData.remainingLives > 0)) {
            names.push(styles.clickable);
        }
        if (progressData && progressData.selectedTexts.includes(text)) {
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
    const textsInFoundGroups = correctGroups.flatMap((group) => group.texts);

    const clueMetas: Array<{ foundGroupIndex: number|null; text: string; }> = [];
    correctGroups.forEach(({ texts }, groupIndex) => {
        for (const text of texts) {
            clueMetas.push({ foundGroupIndex: groupIndex, text });
        }
    });
    // If the grouping solution is still hidden - i.e. it's still the grouping phase of the question - then
    // show the ungrouped clues. Otherwise, solve the remainder of the wall
    if (clue.data.solution === undefined) {
        clue.data.texts.forEach((text) => {
            if (textsInFoundGroups.indexOf(text) === -1) {
                clueMetas.push({ foundGroupIndex: null, text });
            }
        });
    } else {
        // Find the groups from the solution that haven't already been found by the team
        const unfoundGroups = clue.data.solution.filter((_, solutionGroupIndex) => {
            const groupAlreadyFound = correctGroups.some((foundGroup) => foundGroup.solutionGroupIndex === solutionGroupIndex);
            return !groupAlreadyFound;
        });
        // Display those groups as now solved
        let groupIndex = correctGroups.length;
        for (const unfoundGroup of unfoundGroups) {
            for (const unfoundValue of unfoundGroup.texts) {
                // Add to this group
                clueMetas.push({ foundGroupIndex: groupIndex, text: unfoundValue });
            }
            groupIndex++;
        }
    }

    return (
        <>
        <div className={styles.wallGrid}>
            {clueMetas.map((clueMeta, gridIndex) =>
                clueMeta.foundGroupIndex === null ?
                    <VisibleClue
                        key={clueMeta.text}
                        className={getUngroupedClassNames(clueMeta.text, gridIndex)}
                        onClick={() => toggleClue(clueMeta.text)}
                        isRevealed={clue.data.isRevealed}
                        text={clueMeta.text}
                        index={gridIndex}
                    /> :
                    <VisibleClue
                        key={clueMeta.text}
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