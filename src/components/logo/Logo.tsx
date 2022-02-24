import { Link } from 'react-router-dom';
import styles from './Logo.module.css';
import { ReactComponent as LogoSvg } from './logo.svg';

export const Logo = () => {
    return (
        <div className={styles.logoWrapper}>
            <LogoSvg className={styles.logoSvg} />
            <div className={styles.logoText}>
                <span className={styles.onlyne}>Only<span className={styles.ne}>ne</span></span>
                <br/>
                <span className={styles.connect}>Connect</span>
            </div>
        </div>
    );
};

export const LogoHeaderHomeLink = (props: { className?: string; }) => {
    return (
        <Link to="/" className={styles.logoLink + (props.className ? ` ${props.className}` : '')}><Logo /></Link>
    );
};