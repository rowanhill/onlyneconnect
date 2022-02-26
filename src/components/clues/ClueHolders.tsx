import { CollectionQueryItem } from '../../hooks/useCollectionResult';
import { CompoundTextClue, TextClue } from '../../models';
import { HiddenClue, LastInSequenceClue, VisibleClue } from './Clues';
import styles from './ClueHolders.module.css';

export const ConnectionClues = ({ clues }: { clues: Array<CollectionQueryItem<Pick<TextClue, 'isRevealed'|'text'>>> }) => {
    return (
        <div className={styles.cluesHolder}>
            {clues.map((clue, i) => (
                <VisibleClue key={clue.id} isRevealed={clue.data.isRevealed} text={clue.data.text} index={i} />
            ))}
            {arrayUpTo(4 - clues.length).map((n) => (
                <HiddenClue key={n} />
            ))}
        </div>
    );
};

export const SequenceClues = ({ clues, questionExample, secretExample }: {
    clues: Array<CollectionQueryItem<Pick<TextClue,'isRevealed'|'text'>>>;
    questionExample: string|undefined;
    secretExample?: string|undefined;
}) => {
    return (
        <div className={styles.cluesHolder}>
            {clues.map((clue, i) => (
                <VisibleClue key={clue.id} isRevealed={clue.data.isRevealed} text={clue.data.text} index={i} />
            ))}
            {clues.length === 3 &&
                <LastInSequenceClue
                    allOtherCluesRevealed={!clues.some((c) => !c.data.isRevealed)}
                    example={questionExample}
                    exampleFromSecret={secretExample}
                />
            }
            {clues.length < 3 && arrayUpTo(4 - clues.length).map((n) => (
                <HiddenClue key={n} />
            ))}
        </div>
    );
};

export const MissingVowelsClues = ({ clue }: { clue: Pick<CompoundTextClue, 'isRevealed'|'texts'>; }) => {
    return (
        <div className={styles.cluesHolder}>
            {clue.texts.map((text, i) => 
                <VisibleClue key={i} isRevealed={clue.isRevealed} text={text} index={i} />
            )}
        </div>
    );
};

function arrayUpTo(n: number) {
    return Array.from(Array(n).keys());
}