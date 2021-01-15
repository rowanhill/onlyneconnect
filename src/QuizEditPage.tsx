import React, { ChangeEvent, FormEvent, useState } from 'react';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { Link } from 'react-router-dom';
import firebase from './firebase';
import { createChangeHandler } from './forms/changeHandler';
import { useAuth } from './hooks/useAuth';
import { CollectionQueryData, useCollectionResult } from './hooks/useCollectionResult';
import { Clue, Question, Quiz, QuizSecrets } from './models';
import { Page } from './Page';
import { Card } from './Card';
import styles from './QuizEditPage.module.css';

interface QuizEditPageProps {
    quizId: string;
}
export const QuizEditPage = ({ quizId }: QuizEditPageProps) => {
    const db = firebase.firestore();
    const { user } = useAuth();

    // Fetch data
    const [quizData, quizLoading, quizError] = useDocumentData<Quiz>(user ? db.collection('quizzes').doc(quizId) : null);
    const [secretsData, secretsLoading, secretsError] = useDocumentData<QuizSecrets>(user ? db.collection('quizSecrets').doc(quizId) : null);
    const questionsResult = useCollectionResult<Question>(user ? db.collection(`quizzes/${quizId}/questions`) : null);
    const cluesResult = useCollectionResult<Clue>(user ? db.collection(`quizzes/${quizId}/clues`) : null);

    function inner() {
        // Bail out if there are any problems or display a loading notice if we're not loaded yet
        if (quizError || secretsError || questionsResult.error || cluesResult.error) {
            console.log('Could not load quiz', quizError, secretsError, questionsResult.error, cluesResult.error);
            return <div>Could not load quiz. Try again later.</div>;
        }
        if (user && quizData && user.uid !== quizData.ownerId) {
            return <div>No quiz owned by you with id ${quizId} was found</div>;
        }
        if (quizLoading || !user || secretsLoading || questionsResult.loading || cluesResult.loading) {
            return <div>Loading...</div>;
        }
        if (!quizData || !secretsData || !questionsResult.data || !cluesResult.data) {
            return <div>No quiz owned by you with id ${quizId} was found</div>;
        }
        
        return (
            <QuizEditPageLoaded
                quizId={quizId}
                quiz={quizData}
                secrets={secretsData}
                questions={questionsResult.data}
                clues={cluesResult.data}
            />
        );
    }
    return <Page title={quizData ? `Edit ${quizData.name}` : 'Edit quiz'}>{inner()}</Page>;
};

interface EditableClue {
    text: string;
    answerLimit: number | null;
}

interface EditableQuestion {
    answerLimit: number | null;
    clues: [EditableClue, EditableClue, EditableClue, EditableClue];
}

const QuizEditPageLoaded = ({ quizId, quiz, secrets, questions, clues }: {
        quizId: string;
        quiz: Quiz;
        secrets: QuizSecrets;
        questions: CollectionQueryData<Question>;
        clues: CollectionQueryData<Clue>;
}) => {
    const db = firebase.firestore();
    const [name, setName] = useState(quiz.name);
    const [passcode, setPasscode] = useState(secrets.passcode);
    const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
    const [isSubmittingSecrets, setIsSubmittingSecrets] = useState(false);
    const [newQuestion, setNewQuestion] = useState<EditableQuestion|null>(null);
    const [expandedQuestions, setExpandedQuestions] = useState<{ [questionId: string]: true }>({});

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (passcode !== secrets.passcode) {
            firebase.firestore().doc(`quizSecrets/${quizId}`)
                .update({ passcode })
                .catch((error) => console.error('Error updating quiz secrets:', error))
                .finally(() => setIsSubmittingSecrets(false));
            setIsSubmittingSecrets(true);
        }
        if (name !== quiz.name) {
            firebase.firestore().doc(`quizzes/${quizId}`)
                .update({ name })
                .catch((error) => console.error('Error updating quiz:', error))
                .finally(() => setIsSubmittingQuiz(false));
            setIsSubmittingQuiz(true);
        }
    };

    const addNewQuestion = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setNewQuestion({
            answerLimit: null,
            clues: [
                { text: '', answerLimit: 1 },
                { text: '', answerLimit: 1 },
                { text: '', answerLimit: 1 },
                { text: '', answerLimit: 1 },
            ],
        });
    };
    const clearNewQuestion = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setNewQuestion(null);
    };
    const saveNewQuestion = (question: EditableQuestion) => {
        const batch = db.batch();
        
        const quizDoc = db.doc(`quizzes/${quizId}`);
        const clue1Doc = db.collection(`quizzes/${quizId}/clues`).doc();
        const clue2Doc = db.collection(`quizzes/${quizId}/clues`).doc();
        const clue3Doc = db.collection(`quizzes/${quizId}/clues`).doc();
        const clue4Doc = db.collection(`quizzes/${quizId}/clues`).doc();
        const questionDoc = db.collection(`quizzes/${quizId}/questions`).doc();

        batch.set(questionDoc, {
            answerLimit: question.answerLimit,
            isRevealed: false,
            clueIds: [clue1Doc.id, clue2Doc.id, clue3Doc.id, clue4Doc.id],
        });
        batch.set(clue1Doc, {
            questionId: questionDoc.id,
            isRevealed: false,
            text: question.clues[0].text,
            answerLimit: question.clues[0].answerLimit,
        });
        batch.set(clue2Doc, {
            questionId: questionDoc.id,
            isRevealed: false,
            text: question.clues[1].text,
            answerLimit: question.clues[1].answerLimit,
        });
        batch.set(clue3Doc, {
            questionId: questionDoc.id,
            isRevealed: false,
            text: question.clues[2].text,
            answerLimit: question.clues[2].answerLimit,
        });
        batch.set(clue4Doc, {
            questionId: questionDoc.id,
            isRevealed: false,
            text: question.clues[3].text,
            answerLimit: question.clues[3].answerLimit,
        });
        batch.update(quizDoc, {
            questionIds: [...quiz.questionIds, questionDoc.id],
        });
        batch.commit()
            .then(() => setNewQuestion(null))
            .catch((error) => console.error('Failed to create question', error));
    };

    const updateQuestion = (questionId: string, clueIds: string[], question: EditableQuestion) => {
        const batch = db.batch();
        batch.update(db.doc(`quizzes/${quizId}/questions/${questionId}`), {
            answerLimit: question.answerLimit
        });
        for (let i=0; i < clueIds.length; i++) {
            const clue = question.clues[i];
            const clueId = clueIds[i];
            batch.update(db.doc(`quizzes/${quizId}/clues/${clueId}`), clue);
        }
        batch.commit()
            .catch((error) => console.error('Failed to update question', error));
    };
    const deleteQuestion = (questionId: string, clueIds: string[]) => {
        const batch = db.batch();
        batch.delete(db.doc(`quizzes/${quizId}/questions/${questionId}`));
        clueIds.forEach((clueId) => batch.delete(db.doc(`quizzes/${quizId}/clues/${clueId}`)));
        batch.update(db.doc(`quizzes/${quizId}`), {
            questionIds: quiz.questionIds.filter((id) => id !== questionId),
        });
        batch.commit()
            .catch((error) => console.error('Failed to delete question', error));
    };

    const moveUp = (questionId: string) => {
        const index = quiz.questionIds.indexOf(questionId);
        if (index === -1) {
            console.error(`Cannot move up question ${questionId}, not in quiz questions`);
            return;
        }
        if (index === 0) {
            console.warn(`Cannot move up question ${questionId}, already first`);
            return;
        }
        const newOrder = [...quiz.questionIds];
        const element = newOrder[index];
        newOrder.splice(index, 1);
        newOrder.splice(index-1, 0, element);
        db.doc(`quizzes/${quizId}`)
            .update({ questionIds: newOrder })
            .catch((error) => console.error('Could not move up', error));
    };
    const moveDown = (questionId: string) => {
        const index = quiz.questionIds.indexOf(questionId);
        if (index === -1) {
            console.error(`Cannot move down question ${questionId}, not in quiz questions`);
            return;
        }
        if (index === quiz.questionIds.length - 1) {
            console.warn(`Cannot move down question ${questionId}, already last`);
            return;
        }
        const newOrder = [...quiz.questionIds];
        const element = newOrder[index];
        newOrder.splice(index, 1);
        newOrder.splice(index+1, 0, element);
        db.doc(`quizzes/${quizId}`)
            .update({ questionIds: newOrder })
            .catch((error) => console.error('Could not move down', error));
    };

    const collapse = (questionId: string) => {
        const newCollapsed = { ...expandedQuestions };
        delete newCollapsed[questionId];
        setExpandedQuestions(newCollapsed);
    };
    const expand = (questionId: string) => {
        setExpandedQuestions({ ...expandedQuestions, [questionId]: true });
    }

    const questionsById = Object.fromEntries(questions.map((q) => [q.id, q]));
    const cluesById = Object.fromEntries(clues.map((c) => [c.id, c]));
    const questionsAndClues = quiz.questionIds
        .filter((id) => !!questionsById[id] && questionsById[id].data.clueIds.every((id) => !!cluesById[id]))
        .map((id) => ({
            question: questionsById[id],
            clues: questionsById[id].data.clueIds.map((id) => cluesById[id].data) as [Clue, Clue, Clue, Clue],
        }));

    const joinQuizUrl = new URL(`/quiz/${quizId}/create-team`, window.location.href);

    return (
        <>
        <p>Invite people to create teams at {joinQuizUrl.href} or <Link to={`/quiz/${quizId}`}>click here</Link> to play.</p>
        <form onSubmit={submit}>
            <Card>
                <p className={styles.row}>
                    <label>Quiz title</label>
                    <input type="text" value={name} onChange={createChangeHandler(setName)} />
                </p>
                <p className={styles.row}>
                    <label>Quiz passcode</label>
                    <input type="text" value={passcode} onChange={createChangeHandler(setPasscode)} />
                </p>
                <p>
                    <button disabled={isSubmittingQuiz || isSubmittingSecrets}>Save</button>
                </p>
            </Card>
            <div>
                <h2>Questions</h2>
                {questionsAndClues.map(({ question, clues }, questionIndex) => (
                    expandedQuestions[question.id] === true ?
                        <QuestionForm
                            key={question.id}
                            initialQuestion={{ answerLimit: question.data.answerLimit, clues }}
                            questionNumber={questionIndex + 1}
                            save={(updatedQ) => updateQuestion(question.id, question.data.clueIds, updatedQ)}
                            remove={() => deleteQuestion(question.id, question.data.clueIds)}
                            moveUp={questionIndex > 0 ? () => moveUp(question.id) : undefined}
                            moveDown={questionIndex < questionsAndClues.length - 1 ? () => moveDown(question.id) : undefined}
                            collapse={() => collapse(question.id)}
                        /> :
                        <CollapsedQuestion
                            key={question.id}
                            question={{ answerLimit: question.data.answerLimit, clues }}
                            questionNumber={questionIndex + 1}
                            expand={() => expand(question.id)}
                        />
                ))}
                {newQuestion ?
                    <QuestionForm
                        initialQuestion={newQuestion}
                        questionNumber={questionsAndClues.length + 1}
                        save={saveNewQuestion}
                        remove={clearNewQuestion}
                    />
                :
                    <button className={styles.addQuestionButton} onClick={addNewQuestion}>Add question</button>
                }
            </div>
        </form>
        </>
    );
};

interface CollapsedQuestionProps {
    question: EditableQuestion;
    questionNumber: number;
    expand: () => void;
}
const CollapsedQuestion = ({ question, questionNumber, expand }: CollapsedQuestionProps) => {
    return (
        <Card>
            <h3>
                Question {questionNumber}{' '}
                <button onClick={expand}>➕</button>
            </h3>
            <p>
                {question.clues.map((c) => c.text).join(' | ')}
            </p>
        </Card>
    );
}

interface QuestionFormProps {
    initialQuestion: EditableQuestion;
    questionNumber: number;
    save?: (question: EditableQuestion) => void;
    remove: (e: React.MouseEvent<HTMLButtonElement>) => void;
    moveUp?: () => void;
    moveDown?: () => void;
    collapse?: () => void;
}
const QuestionForm = ({ initialQuestion, questionNumber, save, remove, moveUp, moveDown, collapse }: QuestionFormProps) => {
    const [question, setQuestion] = useState(initialQuestion);
    const changeClue = (clueIndex: number, clue: EditableClue) => {
        setQuestion({
            ...question,
            clues: question.clues.map((c, i) => i === clueIndex ? clue : c) as [EditableClue, EditableClue, EditableClue, EditableClue],
        });
    };
    const changeAnswerLimit = (e: ChangeEvent<HTMLInputElement>) => {
        setQuestion({
            ...question,
            answerLimit: e.target.valueAsNumber,
        });
    };
    return (
        <Card>
            <h3>
                Question {questionNumber}{' '}
                {moveUp && <button onClick={moveUp}>⬆️</button>}{' '}
                {moveDown && <button onClick={moveDown}>⬇️</button>}{' '}
                {save && <button onClick={() => save(question)}>✔️</button>}{' '}
                <button onClick={remove}>❌</button>{' '}
                {collapse && <button onClick={collapse}>➖</button>}
            </h3>
            <p className={styles.row}>
                <label>Question answer limit</label>
                <input type="number" value={question.answerLimit || ''} placeholder="No limit" onChange={changeAnswerLimit} />
            </p>
            <h4>Clues</h4>
            {question.clues.map((clue, clueIndex) => (
                <ClueForm key={clueIndex} clueNumber={clueIndex + 1} clue={clue} onChange={(c) => changeClue(clueIndex, c)} />
            ))}
        </Card>
    );
};

const ClueForm = ({ clueNumber, clue, onChange }: { clueNumber: number; clue: EditableClue; onChange: (clue: EditableClue) => void; }) => {
    const changeText = (e: ChangeEvent<HTMLInputElement>) => {
        onChange({
            ...clue,
            text: e.target.value,
        });
    };
    const changeAnswerLimit = (e: ChangeEvent<HTMLInputElement>) => {
        onChange({
            ...clue,
            answerLimit: e.target.valueAsNumber,
        });
    };
    return (
        <>
        <h5>Clue {clueNumber}</h5>
        <p className={styles.row}>
            <label className={styles.cluePropLabel}>Clue text</label>
            <input type="text" value={clue.text} onChange={changeText} />
        </p>
        <p className={styles.row + ' ' + styles.clueRow}>
            <label className={styles.cluePropLabel}>Clue answer limit</label>
            <input type="number" value={clue.answerLimit || ''} placeholder="No limit" onChange={changeAnswerLimit} />
        </p>
        </>
    );
};