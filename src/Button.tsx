import { FunctionComponent } from "react";

import React from 'react';
import styles from './Button.module.css';
import { useAsyncProcessState } from './hooks/useAsyncProcessState';

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


type ButtonType = typeof PrimaryButton | typeof DangerButton | typeof LinkButton;

type FlashMessageButtonProps = ButtonProps & {
    component?: ButtonType;
    performAction: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => Promise<any>;
    render?: FunctionComponent<{ showSuccess: boolean; showError: boolean; }>;
    labelTexts?: {
        normal: string;
        success: string;
        error: string;
    };
};

/**
 * A higher order button that briefly displays a success / error message when an async process's promise settles.
 */
export const FlashMessageButton: FunctionComponent<FlashMessageButtonProps> = ({ component, render, labelTexts, performAction, ...props}) => {
    const processState = useAsyncProcessState();
    
    const Component = component || PrimaryButton;
    
    const startProcess = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        processState.start();
        performAction(event)
            .then(() => processState.flashSuccess())
            .catch(() => processState.flashError());
    };

    const disabled = props.disabled || processState.inProgress;

    return (
        <Component {...props} onClick={startProcess} disabled={disabled}>
            {render && render({ showSuccess: processState.showSuccessMessage, showError: processState.showErrorMessage})}
            {render === undefined && labelTexts && (
                processState.showSuccessMessage ?
                    labelTexts.success :
                    (processState.showErrorMessage ? labelTexts.error : labelTexts.normal)
                )
            }
            {render === undefined && labelTexts === undefined && props.children}
        </Component>
    );
};