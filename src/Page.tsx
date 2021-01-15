import React, { FunctionComponent } from 'react';
import styles from './Page.module.css';

export const Page: FunctionComponent<{ className?: string; title?: string; }> = (props) => {
    return (
        <div className={styles.page + (props.className ? ` ${props.className}` : '')}>
            {props.title && <h1>{props.title}</h1>}
            {props.children}
        </div>
    )
};