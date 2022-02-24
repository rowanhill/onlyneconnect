import { FunctionComponent, ReactElement } from 'react';
import { LogoHeaderHomeLink } from './components/logo/Logo';
import styles from './Page.module.css';

export const Page: FunctionComponent<{ className?: string; title?: string|ReactElement; showLogo?: boolean; }> = (props) => {
    const showLogo = props.showLogo ?? true;
    const title = typeof props.title === 'string' ?
        <h1 className={styles.title}>{props.title}</h1> :
        props.title;
    return (
        <div className={styles.page + (props.className ? ` ${props.className}` : '')}>
            {showLogo &&
            <div>
                <LogoHeaderHomeLink />
                {title}
            </div>}
            {!showLogo && title}
            {props.children}
        </div>
    )
};