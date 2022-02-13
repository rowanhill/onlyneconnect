import { FunctionComponent, useRef } from 'react';
import { Card } from '../Card'
import { useOnClickOutside } from '../hooks/useOnClickOutside';
import styles from './Modal.module.css';

export const Modal: FunctionComponent<{ onClose?: () => void; }> = (props) => {
    const ref = useRef<HTMLDivElement>(null);
    useOnClickOutside(ref, props.onClose);
    return (
        <div ref={ref} className={styles.modalBackground}>
            <Card className={styles.modal}>
                {props.onClose && <div><span className={styles.close} onClick={props.onClose}>&times;</span></div>}
                <div>{props.children}</div>
            </Card>
        </div>
    );
};