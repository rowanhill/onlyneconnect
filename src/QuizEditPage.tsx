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
import {
    CompoundClueSpec, ConnectionQuestionSpec, createConnectionOrSequenceQuestion, createMissingVowelsQuestion,
    MissingVowelsQuestionSpec, SequenceQuestionSpec, TextClueSpec,
} from './models/quiz';

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

type ClueSpec = TextClueSpec | CompoundClueSpec;
type QuestionSpec = ConnectionQuestionSpec | SequenceQuestionSpec | MissingVowelsQuestionSpec;

function getClues(questionSpec: QuestionSpec): ClueSpec[] {
    if (questionSpec.type === 'connection' || questionSpec.type === 'sequence') {
        return questionSpec.clues;
    } else if (questionSpec.type === 'missing-vowels') {
        return [questionSpec.clue];
    } else {
        throwBadQuestionType(questionSpec);
    }
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
    const [newQuestion, setNewQuestion] = useState<QuestionSpec|null>(null);
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
                { text: '', answerLimit: 1, type: 'text' },
                { text: '', answerLimit: 1, type: 'text' },
                { text: '', answerLimit: 1, type: 'text' },
                { text: '', answerLimit: 1, type: 'text' },
            ],
        });
    };
    const addNewSequenceQuestion = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setNewQuestion({
            type: 'sequence',
            answerLimit: null,
            clues: [
                { text: '', answerLimit: 1, type: 'text' },
                { text: '', answerLimit: 1, type: 'text' },
                { text: '', answerLimit: 1, type: 'text' },
            ],
        });
    };
    const addNewMissingVowelsQuestion = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setNewQuestion({
            type: 'missing-vowels',
            answerLimit: 5,
            clue: { texts: ['', '', '', ''], answerLimit: null, type: 'compound-text' },
        });
    };
    const clearNewQuestion = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setNewQuestion(null);
    };
    const saveNewQuestion = (question: QuestionSpec) => {
        let promise: Promise<any>;
        switch (question.type) {
            case 'connection':
            case 'sequence':
                promise = createConnectionOrSequenceQuestion(quizId, question);
                break;
            case 'missing-vowels':
                promise = createMissingVowelsQuestion(quizId, question);
                break;
            default:
                throwBadQuestionType(question);
        }
        promise
            .then(() => setNewQuestion(null))
            .catch((error) => console.error('Failed to create question', error));
    };

    const updateQuestion = (oldSpec: QuestionSpec, newSpec: QuestionSpec) => {
        if (oldSpec.id === undefined) {
            throw new Error('Tried to update a question without an id');
        }
        if (oldSpec.type !== newSpec.type) {
            throw new Error(`Tried to update a question from type ${oldSpec.type} to ${newSpec.type}`);
        }
        const questionId = oldSpec.id;
        const batch = db.batch();
        batch.update(db.doc(`quizzes/${quizId}/questions/${questionId}`), {
            answerLimit: newSpec.answerLimit
        });
        const clues = getClues(newSpec);
        for (let i=0; i < clues.length; i++) {
            const clue = clues[i];
            if (clue.id === undefined) {
                throw new Error('Tried to update clue without id');
            }
            batch.update(db.doc(`quizzes/${quizId}/clues/${clue.id}`), clue);
        }
        batch.commit()
            .catch((error) => console.error('Failed to update question', error));
    };
    const deleteQuestion = (questionSpec: QuestionSpec) => {
        if (questionSpec.id === undefined) {
            throw new Error('Tried to delete a question without an id');
        }
        const batch = db.batch();
        batch.delete(db.doc(`quizzes/${quizId}/questions/${questionSpec.id}`));
        for (const clue of getClues(questionSpec)) {
            if (clue.id === undefined) {
                throw new Error('Tried to delete clue without id');
            }
            batch.delete(db.doc(`quizzes/${quizId}/clues/${clue.id}`));
        }
        batch.update(db.doc(`quizzes/${quizId}`), {
            questionIds: quiz.questionIds.filter((id) => id !== questionSpec.id),
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
    const questionSpecs: QuestionSpec[] = quiz.questionIds
        .filter((id) => {
            const question = questionsById[id];
            if (!question) {
                return false;
            }
            let result;
            if (question.data.type === 'connection' || question.data.type === 'sequence') {
                result = question.data.clueIds.every((id) => !!cluesById[id]);
            } else if (question.data.type === 'missing-vowels') {
                result = !!cluesById[question.data.clueId];
            } else {
                throwBadQuestionType(question.data);
            }
            return result;
        })
        .map((id) => {
            const question = questionsById[id].data;
            let result;
            if (question.type === 'connection') {
                result = {
                    id,
                    type: question.type,
                    answerLimit: question.answerLimit,
                    clues: question.clueIds.map((cid) => {
                        const clue = cluesById[cid];
                        if (!clue) {
                            throw new Error(`Could not find clue ${cid} referenced by question ${id}`);
                        }
                        if (clue.data.type !== 'text') {
                            throw new Error(`Expected a text clue on a connection question, but clue ${cid} is a ${clue.data.type}`);
                        }
                        return { id: cid, answerLimit: clue.data.answerLimit, text: clue.data.text, type: 'text' };
                    }) as Four<TextClueSpec>,
                };
            } else if (question.type === 'sequence') {
                result = {
                    id,
                    type: question.type,
                    answerLimit: question.answerLimit,
                    clues: question.clueIds.map((cid) => {
                        const clue = cluesById[cid];
                        if (!clue) {
                            throw new Error(`Could not find clue ${cid} referenced by question ${id}`);
                        }
                        if (clue.data.type !== 'text') {
                            throw new Error(`Expected a text clue on a sequence question, but clue ${cid} is a ${clue.data.type}`);
                        }
                        return { id: cid, answerLimit: clue.data.answerLimit, text: clue.data.text, type: 'text' };
                    }) as Three<TextClueSpec>,
                };
            } else if (question.type === 'missing-vowels') {
                const clueItem = cluesById[question.clueId];
                if (!clueItem) {
                    throw new Error(`Could not find clue ${question.clueId} referenced by question ${id}`);
                }
                if (clueItem.data.type !== 'compound-text') {
                    throw new Error(`Expected a compound-text clue on a missing-vowels question, but clue ${question.clueId} is a ${clueItem.data.type}`);
                }
                const clueSpec: CompoundClueSpec = {
                    id: question.clueId,
                    answerLimit: clueItem.data.answerLimit,
                    texts: clueItem.data.texts,
                    type: 'compound-text',
                };
                result = {
                    id,
                    type: question.type,
                    answerLimit: question.answerLimit,
                    clue: clueSpec,
                }
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
                {questionSpecs.map((questionSpec, questionIndex) => (
                    expandedQuestions[questionSpec.id!] === true ?
                        <QuestionForm
                            key={questionSpec.id!}
                            initialQuestion={questionSpec}
                            questionNumber={questionIndex + 1}
                            save={(updatedQ) => updateQuestion(questionSpec, updatedQ)}
                            remove={() => deleteQuestion(questionSpec)}
                            moveUp={questionIndex > 0 ? () => moveUp(questionSpec.id!) : undefined}
                            moveDown={questionIndex < questionSpecs.length - 1 ? () => moveDown(questionSpec.id!) : undefined}
                            collapse={() => collapse(questionSpec.id!)}
                        /> :
                        <CollapsedQuestion
                            key={questionSpec.id!}
                            question={questionSpec}
                            questionNumber={questionIndex + 1}
                            expand={() => expand(questionSpec.id!)}
                        />
                ))}
                {newQuestion ?
                    <QuestionForm
                        initialQuestion={newQuestion}
                        questionNumber={questionSpecs.length + 1}
                        save={saveNewQuestion}
                        remove={clearNewQuestion}
                    />
                :
                    <>
                    <PrimaryButton className={styles.addQuestionButton} onClick={addNewConnectionQuestion}>Add connection question</PrimaryButton>
                    <PrimaryButton className={styles.addQuestionButton} onClick={addNewSequenceQuestion}>Add sequence question</PrimaryButton>
                    <PrimaryButton className={styles.addQuestionButton} onClick={addNewMissingVowelsQuestion}>Add missing vowels question</PrimaryButton>
                    </>
                }
            </div>
        </form>
        </>
    );
};

interface CollapsedQuestionProps {
    question: QuestionSpec;
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
                {(question.type === 'missing-vowels' ? question.clue.texts : question.clues.map((c) => c.text)).join(' | ')}
            </p>
        </Card>
    );
}

interface QuestionFormProps {
    initialQuestion: QuestionSpec;
    questionNumber: number;
    save?: (question: QuestionSpec) => void;
    remove: (e: React.MouseEvent<HTMLButtonElement>) => void;
    moveUp?: () => void;
    moveDown?: () => void;
    collapse?: () => void;
}
const QuestionForm = ({ initialQuestion, questionNumber, save, remove, moveUp, moveDown, collapse }: QuestionFormProps) => {
    const [question, setQuestion] = useState(initialQuestion);
    const changeTextClue = (clueIndex: number, clue: TextClueSpec) => {
        if (question.type !== 'connection' && question.type !== 'sequence') {
            throw new Error(`Tried to update a text clue, but parent question is of type ${question.type}`);
        }
        const q = question as ConnectionQuestionSpec|SequenceQuestionSpec;
        setQuestion({
            ...q,
            // Hack: it's a pain to get TS to realise the tuple length remains the same, so we cast as any
            clues: q.clues.map((c, i) => i === clueIndex ? clue : c) as any,
        });
    };
    const changeCompoundClue = (clue: CompoundClueSpec) => {
        if (question.type !== 'missing-vowels') {
            throw new Error(`Tried to update a compound-text clue, but parent question is of type ${question.type}`);
        }
        const q = question as MissingVowelsQuestionSpec;
        setQuestion({ ...q, clue });
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
                <label>Question type</label>
                <span>
                    <QuestionTypeName question={question} />
                </span>
            </p>
            <p className={styles.row}>
                <label>Question answer limit</label>
                <input type="number" value={question.answerLimit || ''} placeholder="No limit" onChange={changeAnswerLimit} />
            </p>
            <h4>Clues</h4>
            {getClues(question).map((clue, clueIndex) => (
                clue.type === 'text' ?
                    <TextClueForm key={clueIndex} clueNumber={clueIndex + 1} clue={clue} onChange={(c) => changeTextClue(clueIndex, c)} /> :
                    <CompoundTextClueForm key={clueIndex} clue={clue} onChange={changeCompoundClue} />
            ))}
        </Card>
    );
};

const QuestionTypeName = ({ question }: { question: QuestionSpec }) => {
    if (question.type === 'connection') {
        return <>Connection</>;
    } else if (question.type === 'sequence') {
        return <>Sequence</>;
    } else if (question.type === 'missing-vowels') {
        return <>Missing Vowels</>;
    } else {
        throwBadQuestionType(question);
    }
};

const TextClueForm = ({ clueNumber, clue, onChange }: { clueNumber: number; clue: TextClueSpec; onChange: (clue: TextClueSpec) => void; }) => {
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

const CompoundTextClueForm = ({ clue, onChange }: { clue: CompoundClueSpec; onChange: (clue: CompoundClueSpec) => void; }) => {
    const changeText = (textIndex: number) =>
        (e: ChangeEvent<HTMLInputElement>) => {
            onChange({
                ...clue,
                texts: clue.texts.map((oldText, i) => i === textIndex ? e.target.value : oldText) as Four<string>,
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
        {clue.texts.map((text, i) =>
            <p key={i} className={styles.row}>
                <label className={styles.cluePropLabel}>Clue {i + 1} text</label>
                <input type="text" value={text} onChange={changeText(i)} />
            </p>
        )}
        <p className={styles.row + ' ' + styles.clueRow}>
            <label className={styles.cluePropLabel}>Clue answer limit</label>
            <input type="number" value={clue.answerLimit || ''} placeholder="No limit" onChange={changeAnswerLimit} />
        </p>
        </>
    );
}