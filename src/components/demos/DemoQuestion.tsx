import { ReactNode, useState } from 'react';
import { PrimaryButton } from '../../Button';
import styles from './DemoQuestion.module.css';

interface DemoQuestionProps {
    children: (stepIndex: number) => [ReactNode]|[ReactNode, string?];
    numSteps: number;
}
export const DemoQuestion = (props: DemoQuestionProps) => {
    const [stepIndex, setStepIndex] = useState(0);
    const [questionComponent, description] = props.children(stepIndex);
    return (
        <>
        <div className={styles.demoQuestion}>
            {questionComponent}
        </div>
        {description && <p>{description}</p>}
        <div>
            <PrimaryButton disabled={stepIndex <= 0} onClick={() => setStepIndex(stepIndex - 1)}>Previous</PrimaryButton>
            <PrimaryButton disabled={stepIndex >= props.numSteps - 1} onClick={() => setStepIndex(stepIndex + 1)}>Next</PrimaryButton>
        </div>
        </>
    );
};