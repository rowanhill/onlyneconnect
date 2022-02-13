import { useEffect, useRef, useState } from 'react';

export const useAsyncProcessState = () => {
    const [inProgress, setInProgress] = useState(false);
    const [messageState, setMessageState] = useState('none' as 'none'|'success'|'error');
    const timeoutRef = useRef<number>();

    // Clear the timeout on unmount, to avoid trying to set state on an unmounted component
    useEffect(() => {
        return () => clearTimeout(timeoutRef.current);
    }, []);

    const start = () => {
        setInProgress(true);
    };
    
    const flashSuccess = () => {
        setInProgress(false);
        setMessageState('success');
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setMessageState('none'), 1000) as unknown as number;
    };

    const flashError = () => {
        setInProgress(false);
        setMessageState('error');
        clearTimeout(timeoutRef.current);
    };

    return {
        inProgress,
        messageState,
        showSuccessMessage: messageState === 'success',
        showErrorMessage: messageState === 'error',
        start,
        flashSuccess,
        flashError,
    };
};