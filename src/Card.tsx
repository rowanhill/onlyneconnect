import React, { FunctionComponent } from 'react';
import styles from './Card.module.css';

export const Card: FunctionComponent<{ className?: string; title?: string; }> = (props) => {
    return (
        <div className={styles.card + (props.className ? ` ${props.className}` : '')}>
            {props.title && <h2>{props.title}</h2>}
            {props.children}
        </div>
    )
};