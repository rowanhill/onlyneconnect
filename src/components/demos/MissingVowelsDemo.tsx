import { ComponentProps } from 'react';
import { MissingVowelsClues } from '../clues/ClueHolders';
import { SingleQuestionConnection } from '../questionConnections/SingleQuestionConnection';
import { DemoQuestion } from './DemoQuestion'

const demoClue: ComponentProps<typeof MissingVowelsClues>['clue'] = {
    isRevealed: true,
    texts: [
        'MRN G',
        'MLT T',
        'MS S',
        'F RT TT',
    ],
};
const demoAnswer = 'Dishes made using eggs';
const demoSteps = [
    { questionIsVisible: false },
    {
        questionIsVisible: true,
        description: "All clues are revealed at once and the race is on - giving a correct answer earlier than others means more points.",
    },
    {
        questionIsVisible: true,
        answerIsVisible: true,
        description: "Once the quiz master reveals the connection, you can't guess any more.",
    },
];

export const MissingVowelsDemo = () => {
    return (
        <DemoQuestion numSteps={demoSteps.length}>
            {(stepIndex) => {
                const step = demoSteps[stepIndex];
                return [
                    <>
                    {step.questionIsVisible && <MissingVowelsClues clue={demoClue} />}
                    {step.answerIsVisible && <SingleQuestionConnection questionConnection={demoAnswer} />}
                    </>,
                    step.description
                ];
            }}
        </DemoQuestion>
    );
};