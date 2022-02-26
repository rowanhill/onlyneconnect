import { ComponentProps, useState } from 'react';
import { PrimaryButton } from '../../Button';
import { MissingVowelsClues } from '../clues/ClueHolders';
import { SingleQuestionConnection } from '../questionConnections/SingleQuestionConnection';
import { OverflowWrapper } from './OverflowWrapper'

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
    const [stepIndex, setStepIndex] = useState(0);
    const step = demoSteps[stepIndex];
    return (
        <>
        <OverflowWrapper>
            {step.questionIsVisible && <MissingVowelsClues clue={demoClue} />}
            {step.answerIsVisible && <SingleQuestionConnection questionConnection={demoAnswer} />}
            <p>{step.description}</p>
            <div>
                <PrimaryButton disabled={stepIndex <= 0} onClick={() => setStepIndex(stepIndex - 1)}>Previous</PrimaryButton>
                <PrimaryButton disabled={stepIndex >= demoSteps.length - 1} onClick={() => setStepIndex(stepIndex + 1)}>Next</PrimaryButton>
            </div>
        </OverflowWrapper>
        </>
    );
};