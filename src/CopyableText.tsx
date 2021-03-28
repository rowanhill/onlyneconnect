import { FlashMessageButton } from './Button'
import * as clipboard from "clipboard-polyfill/text";
import styles from './CopyableText.module.css';

export const CopyableText = ({ value }: { value: string; }) => {
    const copy = () => {
        return clipboard.writeText(value)
            .catch((e) => console.error('Could not copy to clipboard', e));
    };

    return (
        <span className={styles.nowrap}>
            <input disabled value={value} />
            <FlashMessageButton performAction={copy} labelTexts={{ normal: 'Copy', success: 'Copied!', error: 'Error!' }} />
        </span>
    );
};