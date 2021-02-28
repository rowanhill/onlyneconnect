import React from 'react';

export const createChangeHandler = (setValue: React.Dispatch<React.SetStateAction<string>>) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
    }
};