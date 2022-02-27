import { ComponentProps } from 'react';
import { SequenceClues } from '../clues/ClueHolders';
import { SingleQuestionConnection } from '../questionConnections/SingleQuestionConnection';
import { DemoQuestion } from './DemoQuestion'

const demoClues: ComponentProps<typeof SequenceClues>['clues'] = [
    { id: '1', data: { isRevealed: true, text: 'Tin' }},
    { id: '2', data: { isRevealed: true, text: 'China' }},
    { id: '3', data: { isRevealed: true, text: 'Pearl' }},
];
const demoLastClue = 'Ruby';
const demoAnswer = 'Wedding anniversary decades';
const demoSteps = [
    { visibleClues: 0 },
    {
        visibleClues: 1,
        description: "The first clue is revealed when the question starts. Like connection questions, a correct guess here gets you 5 points.",
    },
    {
        visibleClues: 2,
        description: "A correct guess on the second clue is worth 3 points.",
    },
    {
        visibleClues: 3,
        description: "Correctly guessing on the third and final clue is worth 2 points.",
    },
    {
        visibleClues: 4,
        answerIsVisible: true,
        lastClueVisible: true,
        description: "Once the quiz master reveals the answer, you see what comes fourth, but you can't guess any more.",
    },
];

export const SequenceDemo = () => {
    return (
        <DemoQuestion numSteps={demoSteps.length}>
            {(stepIndex) => {
                const step = demoSteps[stepIndex];
                const clues = demoClues.slice(0, step.visibleClues);
                return [
                    <>
                    {step.visibleClues > 0 && <SequenceClues
                        clues={clues}
                        questionExample={step.lastClueVisible ? demoLastClue : undefined}
                    />}
                    {step.answerIsVisible && <SingleQuestionConnection questionConnection={demoAnswer} />}
                    </>,
                    step.description
                ];
            }}
        </DemoQuestion>
    );
};