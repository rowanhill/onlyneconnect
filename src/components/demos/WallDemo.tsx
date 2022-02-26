import { ComponentProps, useState } from 'react';
import { PrimaryButton } from '../../Button';
import { Four } from '../../models';
import { WallCluesPresentation } from '../clues/WallClues';
import { WallQuestionConnections } from '../questionConnections/WallQuestionConnections';
import { DemoQuestionWrapper } from './DemoQuestionWrapper';

const demoSteps = [
    { questionIsVisible: false },
    {
        questionIsVisible: true,
        description: 'The wall starts scrambled.',
    },
    {
        questionIsVisible: true,
        description: 'Team captains can select clues.',
        selectedTexts: ['Bow', 'Mile End'],
    },
    {
        questionIsVisible: true,
        description: 'Teams need to find groups of four connected clues.',
        correctGroups: [
            { texts: ['Bow', 'Mile End', 'Whitechapel', 'Beckton'] as Four<string>, solutionGroupIndex: 0 },
        ],
    },
    {
        questionIsVisible: true,
        description: 'Once two groups are found, you only have three lives to find the remaining groups.',
        correctGroups: [
            { texts: ['Bow', 'Mile End', 'Whitechapel', 'Beckton'] as Four<string>, solutionGroupIndex: 0 },
            { texts: ['Banks', 'Flowers', 'Seaman', 'Stepney'] as Four<string>, solutionGroupIndex: 2 },
        ],
        remainingLives: 3,
    },
    {
        questionIsVisible: true,
        description: 'When the quiz master calls time, all groups are revealed. Teams have one try to name the four connections.',
        correctGroups: [
            { texts: ['Bow', 'Mile End', 'Whitechapel', 'Beckton'] as Four<string>, solutionGroupIndex: 0 },
            { texts: ['Banks', 'Flowers', 'Seaman', 'Stepney'] as Four<string>, solutionGroupIndex: 2 },
        ],
        remainingLives: 3,
        solutionIsRevealed: true,
    },
    {
        questionIsVisible: true,
        description: 'Finally, the quiz master reveals the connections.',
        correctGroups: [
            { texts: ['Bow', 'Mile End', 'Whitechapel', 'Beckton'] as Four<string>, solutionGroupIndex: 0 },
            { texts: ['Banks', 'Flowers', 'Seaman', 'Stepney'] as Four<string>, solutionGroupIndex: 2 },
        ],
        remainingLives: 3,
        solutionIsRevealed: true,
        connectionsAreRevelead: true,
    },
];
const demoClue: ComponentProps<typeof WallCluesPresentation>['clue'] = {
    texts: [
        'Beckton',
        'Seaman',
        'Boating Song',
        'Crop',
        'Keys',
        'Fives',
        'Stepney',
        'Bow',
        'Flowers',
        'Bananas',
        'Balloons',
        'Mess',
        'Whitechapel',
        'Wall game',
        'Mile End',
        'Banks',
    ],
    isRevealed: true,
};
const demoSolution: ComponentProps<typeof WallCluesPresentation>['clue']['solution'] = [
        { texts: ['Whitechapel', 'Mile End', 'Bow', 'Beckton'] },
        { texts: ['Mess', 'Crop', 'Boating Song', 'Wall game'] },
        { texts: ['Banks', 'Flowers', 'Seaman', 'Stepney'] },
        { texts: ['Bananas', 'Fives', 'Keys', 'Balloons'] },
];
const connections: Four<string> = [
'Places in East London',
'Eton',
'England goalkeepers',
'Bunch of ___',
];

export const WallDemo = () => {
    const [stepIndex, setStepIndex] = useState(0);
    const step = demoSteps[stepIndex];
    const clue = step.solutionIsRevealed ?
        { ...demoClue, solution: demoSolution } :
        demoClue;
    return (
        <>
        {step.questionIsVisible && 
            <DemoQuestionWrapper>
                <WallCluesPresentation
                    isEditable={false}
                    toggleClue={()=>{ return; }}
                    clue={clue}
                    progressData={{
                        selectedTexts: step.selectedTexts || [],
                        correctGroups: step.correctGroups,
                        remainingLives: step.remainingLives,
                    }}
                />
                {step.connectionsAreRevelead && <WallQuestionConnections connections={connections} isRevealed={true} />}
            </DemoQuestionWrapper>
        }
        <p>{step.description}</p>
        <div>
            <PrimaryButton disabled={stepIndex <= 0} onClick={() => setStepIndex(stepIndex - 1)}>Previous</PrimaryButton>
            <PrimaryButton disabled={stepIndex >= demoSteps.length - 1} onClick={() => setStepIndex(stepIndex + 1)}>Next</PrimaryButton>
        </div>
        </>
    );
};