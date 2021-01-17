import React, { FunctionComponent } from 'react';
import styles from './Card.module.css';

type DivProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

export const Card: FunctionComponent<DivProps & { className?: string; title?: string; }> = (props) => {
    const { className, title, ...rest } = props;
    return (
        <div className={styles.card + (props.className ? ` ${props.className}` : '')} {...rest}>
            {props.title && <h2>{props.title}</h2>}
            {props.children}
        </div>
    );
};