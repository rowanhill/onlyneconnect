import { ComponentProps } from 'react';
import { ConnectionClues } from '../clues/ClueHolders';
import { SingleQuestionConnection } from '../questionConnections/SingleQuestionConnection';
import { DemoQuestion } from './DemoQuestion';

const demoClues: ComponentProps<typeof ConnectionClues>['clues'] = [
    { id: '1', data: { isRevealed: true, text: 'Olympia' }},
    { id: '2', data: { isRevealed: true, text: 'Babylon' }},
    { id: '3', data: { isRevealed: true, text: 'Alexandria' }},
    { id: '4', data: { isRevealed: true, text: 'Rhodes' }},
];
const demoAnswer = 'Seven Wonders\' locations';
const demoSteps = [
    { visibleClues: 0 },
    {
        visibleClues: 1,
        description: "The first clue is revealed when the question starts. You can make one guess; if it's right, you get 5 points",
    },
    {
        visibleClues: 2,
        description: "After a while, the quiz master reveals the next clue. If you've not already guessed correctly, you can guess again for 3 points.",
    },
    {
        visibleClues: 3,
        description: "The third clue is worth 2 points.",
    },
    {
        visibleClues: 4,
        description: "The fourth and final clue is worth 1 point.",
    },
    {
        visibleClues: 4,
        answerIsVisible: true,
        description: "Once the quiz master reveals the answer, you can't guess any more.",
    },
];

export const ConnectionDemo = () => {
    return (
        <DemoQuestion numSteps={demoSteps.length}>
            {(stepIndex) => {
                const step = demoSteps[stepIndex];
                const clues = demoClues.slice(0, step.visibleClues);
                return [
                    <>
                    {step.visibleClues > 0 && <ConnectionClues clues={clues} />}
                    {step.answerIsVisible && <SingleQuestionConnection questionConnection={demoAnswer} />}
                    </>,
                    step.description
                ];
            }}
        </DemoQuestion>
    );
};