import { FunctionComponent, ReactElement } from 'react';
import { LogoHeaderHomeLink } from './components/logo/Logo';
import styles from './Page.module.css';

export const Page: FunctionComponent<{ className?: string; title?: string|ReactElement; showLogo?: boolean; }> = (props) => {
    const showLogo = props.showLogo ?? true;
    const title = typeof props.title === 'string' ?
        <h1 className={styles.title}>{props.title}</h1> :
        <div className={styles.title}>{props.title}</div>;
    return (
        <div className={styles.page + (props.className ? ` ${props.className}` : '')}>
            {showLogo &&
            <div className={styles.pageHeader}>
                {title}
                <LogoHeaderHomeLink />
            </div>}
            {!showLogo && title}
            {props.children}
        </div>
    )
};