import styles from './QuestionConnection.module.css';

export const SingleQuestionConnection = ({ questionConnection, secretsConnection }: {
    questionConnection: string|undefined;
    secretsConnection?: string|undefined;
}) => {
    if (questionConnection) {
        return (
            <div className={styles.revealedConnection}>{questionConnection}</div>
        );
    } else if (secretsConnection) {
        return (
            <div className={styles.unrevealedConnection}>({secretsConnection})</div>
        );
    } else {
        return null;
    }
};