import styles from './Logo.module.css';
import { ReactComponent as LogoSvg } from './logo.svg';

export const Logo = () => {
    return (
        <div className={styles.logoWrapper}>
            <LogoSvg className={styles.logoSvg} />
            <h1 className={styles.logoText}>
                <span className={styles.onlyne}>Only<span className={styles.ne}>ne</span></span>
                <br/>
                <span className={styles.connect}>Connect</span>
            </h1>
        </div>
    );
};