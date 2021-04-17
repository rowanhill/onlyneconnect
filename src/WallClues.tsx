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

    const getUngroupedClassNames = (text: string, row: number, col: number, isRevealed: boolean) => {
        const names = [];
        if (isRevealed) {
            names.push(styles.ungrouped);
        }
        if (isCaptain && progressData && (progressData.remainingLives === undefined || progressData.remainingLives > 0)) {
            names.push(styles.clickable);
        }
        if (progressData && progressData.selectedTexts.includes(text)) {
            names.push(styles.selected);
        } else {
            names.push(styles.unselected);
        }
        names.push(styles[`col${col + 1}`]);
        names.push(styles[`row${row + 1}`]);
        return names.join(' ');
    };
    const getGroupedClassNames = (groupIndex: number, row: number, col: number) => {
        const names = [styles.wallClue];
        names.push(styles[`group${groupIndex + 1}`]);
        names.push(styles[`col${col + 1}`]);
        names.push(styles[`row${row + 1}`]);
        return names.join(' ');
    };

    // Get the groups found by the team
    const foundGroups = progressData?.correctGroups || [];
    // Get the groups not found by the team but solved by the quiz owner (if any)
    const unfoundSolvedGroups = (clue.data.solution || []).filter((_, solutionGroupIndex) => {
        const groupAlreadyFound = foundGroups.some((foundGroup) => foundGroup.solutionGroupIndex === solutionGroupIndex);
        return !groupAlreadyFound;
    });
    // Get the ungrouped texts neither found by the team nor revealed by the quiz owner (if any)
    const solvedTexts = foundGroups.flatMap((g) => g.texts).concat(unfoundSolvedGroups.flatMap((g) => g.texts));
    const unsolvedTexts = clue.data.solution ?
        [] :
        clue.data.texts.filter((t) => solvedTexts.indexOf(t) === -1);

    const clueMetaByText: { [text: string]: { foundGroupIndex: number | null; row: number; col: number; text: string; } } = {};

    // Create clue metas for clues found by team
    foundGroups.forEach((group, groupIndex) => {
        group.texts.forEach((text, textIndex) => {
            clueMetaByText[text] = {
                foundGroupIndex: groupIndex,
                row: groupIndex,
                col: textIndex,
                text,
            };
        });
    });
    // Create clue metas for clues solved by the quiz owner (if any)
    unfoundSolvedGroups.forEach((group, groupIndex) => {
        group.texts.forEach((text, textIndex) => {
            clueMetaByText[text] = {
                foundGroupIndex: groupIndex + foundGroups.length,
                row: groupIndex + foundGroups.length,
                col: textIndex,
                text,
            };
        });
    });
    // Create clue metas for clues neither found by the team nor solved by the quiz owner (if any)
    const numSolvedClues = (foundGroups.length + unfoundSolvedGroups.length) * 4;
    unsolvedTexts.forEach((text, textIndex) => {
        const clueIndex = numSolvedClues + textIndex;
        clueMetaByText[text] = {
            foundGroupIndex: null,
            row: Math.floor(clueIndex / 4),
            col: clueIndex % 4,
            text,
        };
    });
    
    const clueMetas = clue.data.texts.map((t) => clueMetaByText[t]);

    return (
        <>
        <div data-cy={'wall-grid'} className={styles.wallGrid}>
            {clueMetas.map((clueMeta) =>
                clueMeta.foundGroupIndex === null ?
                    <VisibleClue
                        key={clueMeta.text}
                        className={getUngroupedClassNames(clueMeta.text, clueMeta.row, clueMeta.col, clue.data.isRevealed)}
                        onClick={() => toggleClue(clueMeta.text)}
                        isRevealed={clue.data.isRevealed}
                        text={clueMeta.text}
                        index={clueMeta.row * 4 + clueMeta.col}
                    /> :
                    <VisibleClue
                        key={clueMeta.text}
                        className={getGroupedClassNames(clueMeta.foundGroupIndex, clueMeta.row, clueMeta.col)}
                        isRevealed={clue.data.isRevealed}
                        text={clueMeta.text}
                        index={clueMeta.row * 4 + clueMeta.col}
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