import { FunctionComponent } from "react";

import React from 'react';
import styles from './Button.module.css';

type ButtonProps = React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;

export const PrimaryButton: FunctionComponent<ButtonProps> = (props) => {
    return <StyledButton btnStyle={styles.primary} {...props} />;
};

export const DangerButton: FunctionComponent<ButtonProps> = (props) => {
    return <StyledButton btnStyle={styles.danger} {...props} />;
};

export const LinkButton: FunctionComponent<ButtonProps> = (props) => {
    return <StyledButton btnStyle={styles.asLink} {...props} />;
};

const StyledButton: FunctionComponent<ButtonProps & { btnStyle: string }> = (props) => {
    const { btnStyle, className, ...rest } = props;
    return (
        <button className={btnStyle + (className ? ` ${className}` : '')} {...rest} />
    );
};