import { FunctionComponent } from 'react';
import styles from './DemoQuestionWrapper.module.css';

export const DemoQuestionWrapper: FunctionComponent<{}> = (props) => {
    return <div className={styles.demoQuestion}>{props.children}</div>;
};