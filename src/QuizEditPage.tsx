import React, { ChangeEvent, FormEvent, Fragment, useState } from 'react';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { Link } from 'react-router-dom';
import firebase from './firebase';
import { createChangeHandler, createNullingChangeHandler } from './forms/changeHandler';
import { useAuth } from './hooks/useAuth';
import { CollectionQueryData, CollectionQueryItem, useCollectionResult } from './hooks/useCollectionResult';
import { Clue, ConnectionSecrets, Four, MissingVowelsSecrets, Question, QuestionSecrets, Quiz, QuizSecrets, SequenceSecrets, Three, throwBadClueType, throwBadQuestionType, WallSecrets } from './models';
import { Page } from './Page';
import { Card } from './Card';
import { PrimaryButton } from './Button';
import styles from './QuizEditPage.module.css';
import formStyles from './form.module.css';
import {
    CompoundClueSpec, ConnectionQuestionSpec, createConnectionOrSequenceQuestion, createMissingVowelsQuestion,
    createWallQuestion,
    FourByFourTextClueSpec,
    MissingVowelsQuestionSpec, SequenceQuestionSpec, TextClueSpec, WallQuestionSpec,
} from './models/quiz';

interface QuizEditPageProps {
    quizId: string;
}
const QuizEditPage = ({ quizId }: QuizEditPageProps) => {
    const db = firebase.firestore();
    const { user } = useAuth();

    // Fetch data
    const [quizData, quizLoading, quizError] = useDocumentData<Quiz>(user ? db.collection('quizzes').doc(quizId) : null);
    const [secretsData, secretsLoading, secretsError] = useDocumentData<QuizSecrets>(user ? db.collection('quizSecrets').doc(quizId) : null);
    const questionsResult = useCollectionResult<Question>(user ? db.collection(`quizzes/${quizId}/questions`) : null);
    const cluesResult = useCollectionResult<Clue>(user ? db.collection(`quizzes/${quizId}/clues`) : null);
    const questionSecretsResult = useCollectionResult<QuestionSecrets>(user ? db.collection(`quizzes/${quizId}/questionSecrets`) : null);

    function inner() {
        // Bail out if there are any problems or display a loading notice if we're not loaded yet
        if (quizError || secretsError || questionsResult.error || cluesResult.error || questionSecretsResult.error) {
            console.warn('Could not load quiz', quizError, secretsError, questionsResult.error, cluesResult.error, questionSecretsResult.error);
            return <div>Could not load quiz. Try again later.</div>;
        }
        if (user && quizData && user.uid !== quizData.ownerId) {
            return <div>No quiz owned by you with id ${quizId} was found</div>;
        }
        if (quizLoading || !user || secretsLoading || questionsResult.loading || cluesResult.loading || questionSecretsResult.loading) {
            return <div>Loading...</div>;
        }
        if (!quizData || !secretsData || !questionsResult.data || !cluesResult.data || !questionSecretsResult.data) {
            return <div>No quiz owned by you with id ${quizId} was found</div>;
        }
        
        return (
            <QuizEditPageLoaded
                quizId={quizId}
                quiz={quizData}
                secrets={secretsData}
                questions={questionsResult.data}
                clues={cluesResult.data}
                questionSecrets={questionSecretsResult.data}
            />
        );
    }
    return <Page title={quizData ? `Edit ${quizData.name}` : 'Edit quiz'}>{inner()}</Page>;
};

export default QuizEditPage;

type ClueSpec = TextClueSpec | FourByFourTextClueSpec | CompoundClueSpec;
type QuestionSpec = ConnectionQuestionSpec | SequenceQuestionSpec | WallQuestionSpec | MissingVowelsQuestionSpec;

function getClues(questionSpec: QuestionSpec): ClueSpec[] {
    if (questionSpec.type === 'connection' || questionSpec.type === 'sequence') {
        return questionSpec.clues;
    } else if (questionSpec.type === 'wall' || questionSpec.type === 'missing-vowels') {
        return [questionSpec.clue];
    } else {
        throwBadQuestionType(questionSpec);
    }
} 

const QuizEditPageLoaded = ({ quizId, quiz, secrets, questions, clues, questionSecrets }: {
        quizId: string;
        quiz: Quiz;
        secrets: QuizSecrets;
        questions: CollectionQueryData<Question>;
        clues: CollectionQueryData<Clue>;
        questionSecrets: CollectionQueryData<QuestionSecrets>;
}) => {
    const db = firebase.firestore();
    const [name, setName] = useState(quiz.name);
    const [passcode, setPasscode] = useState(secrets.passcode);
    const [youTubeVideoId, setYouTubeVideoId] = useState(quiz.youTubeVideoId);
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
        if (name !== quiz.name || youTubeVideoId !== quiz.youTubeVideoId) {
            firebase.firestore().doc(`quizzes/${quizId}`)
                .update({ name, youTubeVideoId })
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
            connection: '',
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
            connection: '',
            exampleLastInSequence: '',
            clues: [
                { text: '', answerLimit: 1, type: 'text' },
                { text: '', answerLimit: 1, type: 'text' },
                { text: '', answerLimit: 1, type: 'text' },
            ],
        });
    };
    const addNewWallQuestion = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setNewQuestion({
            type: 'wall',
            answerLimit: null,
            clue: {
                answerLimit: null,
                type: 'four-by-four-text',
                solution: [
                    { texts: ['', '', '', ''] },
                    { texts: ['', '', '', ''] },
                    { texts: ['', '', '', ''] },
                    { texts: ['', '', '', ''] },
                ],
                connections: ['', '', '', ''],
            },
        });
    }
    const addNewMissingVowelsQuestion = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setNewQuestion({
            type: 'missing-vowels',
            answerLimit: 5,
            connection: '',
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
            case 'wall':
                promise = createWallQuestion(quizId, question);
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
        const secretDoc = db.doc(`quizzes/${quizId}/questionSecrets/${questionId}`);
        switch (newSpec.type) {
            case 'connection':
            case 'missing-vowels':
                const conSecretUpdate = { connection: newSpec.connection };
                batch.update(secretDoc, conSecretUpdate);
                break;
            case 'sequence':
                const seqSecretUpdate = { connection: newSpec.connection, exampleLastInSequence: newSpec.exampleLastInSequence };
                batch.update(secretDoc, seqSecretUpdate);
                break;
            case 'wall':
                const wallSecretUpdate = { connections: newSpec.clue.connections, solution: newSpec.clue.solution };
                batch.update(secretDoc, wallSecretUpdate);
                break;
            default:
                throwBadQuestionType(newSpec);
        }
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
        batch.delete(db.doc(`quizzes/${quizId}/questionSecrets/${questionSpec.id}`));
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
    const questionSecretsById = Object.fromEntries(questionSecrets.map((cs) => [cs.id, cs]));
    const defaultConnectionSecretItem: CollectionQueryItem<ConnectionSecrets> = {
        id: 'loading',
        data: { connection: 'Loading connection', type: 'connection' },
    };
    const defaultSequenceSecretItem: CollectionQueryItem<SequenceSecrets> = {
        id: 'loading',
        data: { connection: 'Loading connection', exampleLastInSequence: 'Loading example', type: 'sequence' },
    };
    const defaultWallSecretItem: CollectionQueryItem<WallSecrets> = {
        id: 'loading',
        data: {
            solution: [
                { texts: ['', '', '', ''] },
                { texts: ['', '', '', ''] },
                { texts: ['', '', '', ''] },
                { texts: ['', '', '', ''] },
            ],
            connections: ['Loading connection', 'Loading connection', 'Loading connection', 'Loading connection'],
            type: 'wall',
        },
    };
    const defaultMissingVowelsSecretItem: CollectionQueryItem<MissingVowelsSecrets> = {
        id: 'loading',
        data: { connection: 'Loading connection', type: 'missing-vowels' },
    };
    const questionSpecs: QuestionSpec[] = quiz.questionIds
        .filter((id) => {
            const question = questionsById[id];
            if (!question) {
                return false;
            }
            let result;
            if (question.data.type === 'connection' || question.data.type === 'sequence') {
                result = question.data.clueIds.every((id) => !!cluesById[id]);
            } else if (question.data.type === 'wall') {
                result = !!cluesById[question.data.clueId] && !!questionSecretsById[question.id];
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
                const questionSecretsItem = questionSecretsById[id] || defaultConnectionSecretItem;
                if (questionSecretsItem.data.type !== 'connection') {
                    throw new Error(`Expected a connection secret on a connection question, but question secret ${id} is a ${questionSecretsItem.data.type}`);
                }
                result = {
                    id,
                    type: question.type,
                    answerLimit: question.answerLimit,
                    connection: questionSecretsItem.data.connection,
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
                const questionSecretsItem = questionSecretsById[id] || defaultSequenceSecretItem;
                if (questionSecretsItem.data.type !== 'sequence') {
                    throw new Error(`Expected a sequence secret on a sequence question, but question secret ${id} is a ${questionSecretsItem.data.type}`);
                }
                result = {
                    id,
                    type: question.type,
                    answerLimit: question.answerLimit,
                    connection: questionSecretsItem.data.connection || 'Could not load',
                    exampleLastInSequence: questionSecretsItem.data.exampleLastInSequence || 'Could not load',
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
            } else if (question.type === 'wall') {
                const clueItem = cluesById[question.clueId];
                const questionSecretsItem = questionSecretsById[id] || defaultWallSecretItem;
                if (!clueItem) {
                    throw new Error(`Could not find clue ${question.clueId} referenced by question ${id}`);
                }
                if (clueItem.data.type !== 'four-by-four-text') {
                    throw new Error(`Expected a four-by-four-text clue on a wall question, but clue ${question.clueId} is a ${clueItem.data.type}`);
                }
                if (questionSecretsItem.data.type !== 'wall') {
                    throw new Error(`Expected a wall secret on a wall question, but question secret ${id} is a ${questionSecretsItem.data.type}`);
                }
                const clueSpec: FourByFourTextClueSpec = {
                    id: question.clueId,
                    answerLimit: clueItem.data.answerLimit,
                    solution: questionSecretsItem.data.solution,
                    connections: questionSecretsItem.data.connections,
                    type: 'four-by-four-text',
                };
                result = {
                    id,
                    type: question.type,
                    answerLimit: question.answerLimit,
                    clue: clueSpec,
                }
            } else if (question.type === 'missing-vowels') {
                const questionSecretsItem = questionSecretsById[id] || defaultMissingVowelsSecretItem;
                const clueItem = cluesById[question.clueId];
                if (questionSecretsItem.data.type !== 'missing-vowels') {
                    throw new Error(`Expected a missing-vowels secret on a missing-vowels question, but question secret ${id} is a ${questionSecretsItem.data.type}`);
                }
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
                    connection: questionSecretsItem.data.connection || 'Not loaded',
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
                <p>
                    <h4 className={formStyles.fieldTitle}><label>Quiz title</label></h4>
                    <input type="text" value={name} onChange={createChangeHandler(setName)} />
                    <p className={formStyles.fieldDescription}>The quiz name is the title your quiz will have. All players will be able to see this name.</p>
                </p>
                <p>
                    <h4 className={formStyles.fieldTitle}><label>Quiz passcode</label></h4>
                    <input type="text" value={passcode} onChange={createChangeHandler(setPasscode)} />
                    <p className={formStyles.fieldDescription}>The passcode is a secret phrase people must enter to create a team.</p>
                </p>
                <p>
                    <h4 className={formStyles.fieldTitle}><label>YouTube video ID</label></h4>
                    <input type="text" value={youTubeVideoId || ''} onChange={createNullingChangeHandler(setYouTubeVideoId)} />
                    <p className={formStyles.fieldDescription}>Optional. The ID of a YouTube live stream video of the host.</p>
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
                            moveUp={questionIndex > 0 ? () => moveUp(questionSpec.id!) : undefined}
                            moveDown={questionIndex < questionSpecs.length - 1 ? () => moveDown(questionSpec.id!) : undefined}
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
                    <PrimaryButton className={styles.addQuestionButton} onClick={addNewConnectionQuestion}>Add connection question</PrimaryButton>{' '}
                    <PrimaryButton className={styles.addQuestionButton} onClick={addNewSequenceQuestion}>Add sequence question</PrimaryButton>{' '}
                    <PrimaryButton className={styles.addQuestionButton} onClick={addNewWallQuestion}>Add wall question</PrimaryButton>{' '}
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
    moveUp?: () => void;
    moveDown?: () => void;
    expand: () => void;
}
const CollapsedQuestion = ({ question, questionNumber, moveUp, moveDown, expand }: CollapsedQuestionProps) => {
    return (
        <Card>
            <h3>
                Question {questionNumber}{' '}
                {moveUp && <PrimaryButton onClick={moveUp}>⬆️</PrimaryButton>}{' '}
                {moveDown && <PrimaryButton onClick={moveDown}>⬇️</PrimaryButton>}{' '}
                <PrimaryButton onClick={expand}>➕</PrimaryButton>
            </h3>
            <p>
                {clueTextSummary(question)}
            </p>
        </Card>
    );
};
const clueTextSummary = (question: QuestionSpec) => {
    switch (question.type) {
        case 'connection':
        case 'sequence':
            return question.clues.map((c) => c.text).join(' | ');
        case 'wall':
            return question.clue.solution.map((group) => group.texts.join(' | ')).join(' // ');
        case 'missing-vowels':
            return question.clue.texts.join(' | ');
        default:
            throwBadQuestionType(question);
    }
};

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
    const [isValid, setIsValid] = useState(true);
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
    const changeFourByFourClue = (clue: FourByFourTextClueSpec) => {
        if (question.type !== 'wall') {
            throw new Error(`Tried to update a wall clue, but parent question is of type ${question.type}`);
        }
        const q = question as WallQuestionSpec;
        setQuestion({ ...q, clue });
        const flatTexts = clue.solution.flatMap((group) => group.texts);
        const isValid = (new Set(flatTexts)).size === flatTexts.length;
        setIsValid(isValid);
    };
    const changeAnswerLimit = (e: ChangeEvent<HTMLInputElement>) => {
        setQuestion({
            ...question,
            answerLimit: e.target.valueAsNumber,
        } as ConnectionQuestionSpec | SequenceQuestionSpec | MissingVowelsQuestionSpec);
    };
    const changeConnection = (e: ChangeEvent<HTMLInputElement>) => {
        setQuestion({
            ...question,
            connection: e.target.value,
        } as ConnectionQuestionSpec | SequenceQuestionSpec | MissingVowelsQuestionSpec);
    };
    const changeExampleLastInSequence = (e: ChangeEvent<HTMLInputElement>) => {
        setQuestion({
            ...question,
            exampleLastInSequence: e.target.value,
        } as SequenceQuestionSpec);
    };

    const getClueForm = (clue: ClueSpec, clueIndex: number) => {
        switch (clue.type) {
            case 'text':
                return <TextClueForm key={clueIndex} clueNumber={clueIndex + 1} clue={clue} onChange={(c) => changeTextClue(clueIndex, c)} />;
            case 'compound-text':
                return <CompoundTextClueForm key={clueIndex} clue={clue} onChange={changeCompoundClue} />;
            case 'four-by-four-text':
                return <FourByFourClueForm key={clueIndex} clue={clue} onChange={changeFourByFourClue} />;
            default:
                throwBadClueType(clue);
        }
    };

    return (
        <Card>
            <h3>
                Question {questionNumber}{' '}
                {moveUp && <PrimaryButton onClick={moveUp}>⬆️</PrimaryButton>}{' '}
                {moveDown && <PrimaryButton onClick={moveDown}>⬇️</PrimaryButton>}{' '}
                {save && <PrimaryButton onClick={() => save(question)} disabled={!isValid}>✔️</PrimaryButton>}{' '}
                <PrimaryButton onClick={remove}>❌</PrimaryButton>{' '}
                {collapse && <PrimaryButton onClick={collapse}>➖</PrimaryButton>}
            </h3>
            <p className={styles.row}>
                <label>Question type</label>
                <span>
                    <QuestionTypeName question={question} />
                </span>
            </p>
            {question.type !== 'wall' &&
            <>
            <p className={styles.row}>
                <label>Question answer limit</label>
                <input type="number" value={question.answerLimit || ''} placeholder="No limit" onChange={changeAnswerLimit} />
            </p>
            <p className={styles.row}>
                <label>Connection</label>
                <input type="text" value={question.connection} onChange={changeConnection} />
            </p>
            </>
            }
            <h4>Clues</h4>
            {getClues(question).map((clue, clueIndex) => (
                getClueForm(clue, clueIndex)
            ))}
            {question.type === 'sequence' &&
            <p className={styles.row}>
                <label>Example last item in sequence</label>
                <input type="text" value={question.exampleLastInSequence} onChange={changeExampleLastInSequence} />
            </p>
            }
        </Card>
    );
};

const QuestionTypeName = ({ question }: { question: QuestionSpec }) => {
    if (question.type === 'connection') {
        return <>Connection</>;
    } else if (question.type === 'sequence') {
        return <>Sequence</>;
    } else if (question.type === 'wall') {
        return <>Wall</>;
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
};

const FourByFourClueForm = ({ clue, onChange }: { clue: FourByFourTextClueSpec; onChange: (clue: FourByFourTextClueSpec) => void; }) => {
    const changeText = (groupIndex: number, textIndex: number) =>
        (e: ChangeEvent<HTMLInputElement>) => {
            onChange({
                ...clue,
                solution: clue.solution.map((oldGroup, g) =>
                    g === groupIndex ?
                        {
                            ...oldGroup,
                            texts: oldGroup.texts.map((oldText, i) => i === textIndex ? e.target.value : oldText) as Four<string>,
                        } :
                        oldGroup
                    ,
                ) as Four<{ texts: Four<string>; connection: string; }>
            });
        };
    const changeConnection = (groupIndex: number) =>
        (e: ChangeEvent<HTMLInputElement>) => {
            onChange({
                ...clue,
                connections: clue.connections.map((oldConn, i) => i === groupIndex ? e.target.value : oldConn) as Four<string>,
            });
        };
    return (
        <>
        {clue.solution.map((group, groupIndex) =>
            <Fragment key={groupIndex}>
                <p className={styles.row}>
                    <label className={styles.cluePropLabel}>Group {groupIndex + 1}:</label>
                </p>
                <p className={styles.row}>
                    <label className={styles.cluePropLabel}>Connection</label>
                    <input type="text" value={clue.connections[groupIndex]} onChange={changeConnection(groupIndex)} />
                </p>
                {group.texts.map((text, textIndex) =>
                    <p key={textIndex} className={styles.row}>
                        <label className={styles.cluePropLabel}>Item {textIndex + 1}</label>
                        <input type="text" value={text} onChange={changeText(groupIndex, textIndex)} />
                    </p>
                )}
            </Fragment>
        )}
        </>
    );
};