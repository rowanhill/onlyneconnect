import { PrimaryButton } from './Button'

import * as clipboard from "clipboard-polyfill/text";
import styles from './CopyableText.module.css';
import { useRef, useState } from 'react';

export const CopyableText = ({ value }: { value: string; }) => {
    const [showCopySuccess, setShowCopySuccess] = useState(false);
    const blah = useRef<number>();
    const displayCopiedAndSetTimer = () => {
        setShowCopySuccess(true);
        clearTimeout(blah.current);
        blah.current = setTimeout(() => setShowCopySuccess(false), 1000) as unknown as number;
    };
    const copy = () => {
        clipboard.writeText(value)
            .then(displayCopiedAndSetTimer)
            .catch((e) => console.error('Could not copy to clipboard', e));
    };
    return (
        <span className={styles.nowrap}>
            <input disabled value={value} />
            <PrimaryButton onClick={copy}>{showCopySuccess ? 'Copied!' : 'Copy'}</PrimaryButton>
        </span>
    );
};