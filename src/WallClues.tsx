import React, { useEffect, useState } from 'react';
import { VisibleClue } from './Clues';
import { CollectionQueryItem } from './hooks/useCollectionResult';
import firebase from './firebase';
import './firebase-functions';
import { FourByFourTextClue, WallInProgress } from './models';
import styles from './WallClues.module.css';
import { useQuizContext, usePlayerTeamContext, useWallInProgressContext } from './contexts/quizPage';
import { createWallInProgress, updateWallInProgressSelections } from './models/wallInProgress';

export const WallClues = ({ clue }: { clue: CollectionQueryItem<FourByFourTextClue>; }) => {
    const { quizId } = useQuizContext();
    const { teamId, isCaptain } = usePlayerTeamContext();
    const { wipByTeamByClue } = useWallInProgressContext();

    let progressItem: CollectionQueryItem<WallInProgress> | undefined;
    if (wipByTeamByClue && teamId && wipByTeamByClue[clue.id]) {
        progressItem = wipByTeamByClue[clue.id][teamId]
    }

    // If there's no WallInProgress document for this team & clue, the team captain creates (exactly) one
    const [hasCreated, setHasCreated] = useState(false);
    useEffect(() => {
        if (isCaptain && !progressItem && hasCreated === false && teamId) {
            createWallInProgress(quizId, clue.data.questionId, clue.id, teamId);
            setHasCreated(true);
        }
    }, [isCaptain, progressItem, hasCreated, teamId, quizId, clue, setHasCreated]);

    const progressData = progressItem?.data;

    const toggleClue = (text: string) => {
        if (!isCaptain || !progressItem || !progressData ||
            progressData.selectedTexts.length >= 4 ||
            (progressData.remainingLives !== undefined && progressData.remainingLives <= 0)
        ) {
            return;
        }
        if (progressData.selectedTexts.includes(text)) {
            const newTexts = progressData.selectedTexts.filter((selectedText) => selectedText !== text);
            updateWallInProgressSelections(quizId, progressItem.id, newTexts);
        } else {
            const newTexts = [...progressData.selectedTexts, text];
            updateWallInProgressSelections(quizId, progressItem.id, newTexts);

            if (newTexts.length >= 4) {
                const checkIfWallGroupIsInSolution = firebase.functions().httpsCallable('checkIfWallGroupIsInSolution');
                checkIfWallGroupIsInSolution({ quizId, wipId: progressItem.id, texts: newTexts });
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
        {clue.data.solution === undefined && progressData &&
            <h4>Find groups of four by clicking on clues to select them.</h4>
        }
        {clue.data.solution === undefined && progressData && progressData.remainingLives === undefined &&
            <p>You have as many attempts as you like until you find two groups.</p>
        }
        {clue.data.solution === undefined && progressData?.remainingLives !== undefined && 
            <p>
                {progressData.remainingLives} attempt(s) remaining.{' '}
                {progressData.remainingLives === 0 && 'The wall is frozen! Wait for groups to be revealed.'}
                {progressData.remainingLives === 1 && '💙'}
                {progressData.remainingLives === 2 && '💙💙'}
                {progressData.remainingLives >= 3 && '💙💙💙'}
            </p>
        }
        </>
    );
};