import { Four } from '../../models';
import styles from './WallQuestionConnections.module.css';

export const WallQuestionConnections = ({ connections, isRevealed }: {
    connections: Four<string>;
    isRevealed: boolean;
}) => {
    const groupClassName = (i: number) => {
        if (isRevealed) {
            return `group${i + 1}`;
        } else {
            return 'unrevealedGroup';
        }
    };
    const text = (connection: string) => {
        if (isRevealed) {
            return connection;
        } else {
            return `(${connection})`;
        }
    }
    return (
        <div className={styles.connections}>
            {connections.map((con, i) =>
                <div className={styles.groupConnection + ' ' + styles[groupClassName(i)]} key={con}>{text(con)}</div>
            )}
        </div>
    );
};