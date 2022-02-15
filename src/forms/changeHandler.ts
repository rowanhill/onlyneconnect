import React from 'react';

export const createChangeHandler = (setValue: (value: string) => void) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
    };
};

export const createNullingChangeHandler = (setValue: (value: string | null) => void) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value === '') {
            setValue(null);
        } else {
            setValue(e.target.value);
        }
    };
};

export const createCheckboxHandler = (setValue: (value: boolean) => void) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.checked);
    };
}