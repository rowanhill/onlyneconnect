import React, { ChangeEvent, FormEvent, useState } from 'react';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { Link } from 'react-router-dom';
import firebase from './firebase';
import { createChangeHandler } from './forms/changeHandler';
import { useAuth } from './hooks/useAuth';
import { CollectionQueryData, useCollectionResult } from './hooks/useCollectionResult';
import { Clue, Four, Question, Quiz, QuizSecrets, Three, throwBadQuestionType } from './models';
import { Page } from './Page';
import { Card } from './Card';
import { PrimaryButton } from './Button';
import styles from './QuizEditPage.module.css';
import { createConnectionOrSequenceQuestion } from './models/quiz';

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

interface EditableConnectionQuestion {
    type: 'connection';
    answerLimit: number | null;
    clues: Four<EditableClue>;
}
interface EditableSequenceQuestion {
    type: 'sequence';
    answerLimit: number | null;
    clues: Three<EditableClue>;
}
type EditableQuestion = EditableConnectionQuestion | EditableSequenceQuestion;

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

    const addNewConnectionQuestion = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setNewQuestion({
            type: 'connection',
            answerLimit: null,
            clues: [
                { text: '', answerLimit: 1 },
                { text: '', answerLimit: 1 },
                { text: '', answerLimit: 1 },
                { text: '', answerLimit: 1 },
            ],
        });
    };
    const addNewSequenceQuestion = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setNewQuestion({
            type: 'sequence',
            answerLimit: null,
            clues: [
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
        let promise;
        switch (question.type) {
            case 'connection':
            case 'sequence':
                promise = createConnectionOrSequenceQuestion(quizId, question);
                break;
            default:
                throwBadQuestionType(question);
        }
        promise
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
    const editableQuestionAndIds: { editableQuestion: EditableQuestion; questionId: string; clueIds: string[]; }[] = quiz.questionIds
        .filter((id) => !!questionsById[id] && questionsById[id].data.clueIds.every((id) => !!cluesById[id]))
        .map((id) => {
            const question = questionsById[id].data;
            let result;
            if (question.type === 'connection') {
                result = {
                    editableQuestion: {
                        type: question.type,
                        answerLimit: question.answerLimit,
                        clues: question.clueIds.map((id) => cluesById[id].data) as Four<Clue>,
                    },
                    questionId: id,
                    clueIds: question.clueIds,
                };
            } else if (question.type === 'sequence') {
                result = {
                    editableQuestion: {
                        type: question.type,
                        answerLimit: question.answerLimit,
                        clues: question.clueIds.map((id) => cluesById[id].data) as Three<Clue>,
                    },
                    questionId: id,
                    clueIds: question.clueIds,
                };
            } else {
                throwBadQuestionType(question);
            }
            return result;
        });

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
                    <PrimaryButton disabled={isSubmittingQuiz || isSubmittingSecrets}>Save</PrimaryButton>
                </p>
            </Card>
            <div>
                <h2>Questions</h2>
                {editableQuestionAndIds.map(({ editableQuestion, questionId, clueIds }, questionIndex) => (
                    expandedQuestions[questionId] === true ?
                        <QuestionForm
                            key={questionId}
                            initialQuestion={editableQuestion}
                            questionNumber={questionIndex + 1}
                            save={(updatedQ) => updateQuestion(questionId, clueIds, updatedQ)}
                            remove={() => deleteQuestion(questionId, clueIds)}
                            moveUp={questionIndex > 0 ? () => moveUp(questionId) : undefined}
                            moveDown={questionIndex < editableQuestionAndIds.length - 1 ? () => moveDown(questionId) : undefined}
                            collapse={() => collapse(questionId)}
                        /> :
                        <CollapsedQuestion
                            key={questionId}
                            question={editableQuestion}
                            questionNumber={questionIndex + 1}
                            expand={() => expand(questionId)}
                        />
                ))}
                {newQuestion ?
                    <QuestionForm
                        initialQuestion={newQuestion}
                        questionNumber={editableQuestionAndIds.length + 1}
                        save={saveNewQuestion}
                        remove={clearNewQuestion}
                    />
                :
                    <>
                    <PrimaryButton className={styles.addQuestionButton} onClick={addNewConnectionQuestion}>Add connection question</PrimaryButton>
                    <PrimaryButton className={styles.addQuestionButton} onClick={addNewSequenceQuestion}>Add sequence question</PrimaryButton>
                    </>
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
                <PrimaryButton onClick={expand}>➕</PrimaryButton>
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
            // Hack: it's a pain to get TS to realise the tuple length remains the same, so we cast as any
            clues: question.clues.map((c, i) => i === clueIndex ? clue : c) as any,
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
                {moveUp && <PrimaryButton onClick={moveUp}>⬆️</PrimaryButton>}{' '}
                {moveDown && <PrimaryButton onClick={moveDown}>⬇️</PrimaryButton>}{' '}
                {save && <PrimaryButton onClick={() => save(question)}>✔️</PrimaryButton>}{' '}
                <PrimaryButton onClick={remove}>❌</PrimaryButton>{' '}
                {collapse && <PrimaryButton onClick={collapse}>➖</PrimaryButton>}
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