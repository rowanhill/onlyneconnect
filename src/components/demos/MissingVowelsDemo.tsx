import { ComponentProps } from 'react';
import { Four } from '../../models';
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
const demoSolution: Four<string> = [
    'MERINGUE',
    'OMLETTE',
    'MOUSSE',
    'FRITTATA',
];
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
                const clue = step.answerIsVisible ?
                    {...demoClue, solution: demoSolution} :
                    demoClue;
                return [
                    <>
                    {step.questionIsVisible && <MissingVowelsClues clue={clue} />}
                    {step.answerIsVisible && <SingleQuestionConnection questionConnection={demoAnswer} />}
                    </>,
                    step.description
                ];
            }}
        </DemoQuestion>
    );
};