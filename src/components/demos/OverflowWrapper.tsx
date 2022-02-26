import { FunctionComponent } from 'react';
import styles from './OverflowWrapper.module.css';

export const OverflowWrapper: FunctionComponent<{}> = (props) => {
    return <div className={styles.overflowWrapper}>{props.children}</div>;
};