import { shuffleArray } from '../arrayUtil';
import { CompoundTextClue, ConnectionQuestion, ConnectionSecrets, Four, FourByFourTextClue, MissingVowelsQuestion, MissingVowelsSecrets, SequenceQuestion, SequenceSecrets, Sixteen, TextClue, Three, WallQuestion, WallSecrets } from './index';

export interface TextClueSpec {
    id?: string;
    text: string;
    answerLimit: number;
    type: 'text';
}

export interface CompoundClueSpec {
    id?: string;
    texts: Four<string>;
    answerLimit: null;
    type: 'compound-text';
}

export interface FourByFourTextClueSpec {
    id?: string;
    solution: Four<{ texts: Four<string>; }>;
    connections: Four<string>;
    answerLimit: null;
    type: 'four-by-four-text';
}

export interface ConnectionQuestionSpec {
    id?: string;
    answerLimit: null;
    clues: Four<TextClueSpec>;
    connection: string;
    type: 'connection';
}

export interface SequenceQuestionSpec {
    id?: string;
    answerLimit: null;
    clues: Three<TextClueSpec>;
    connection: string;
    exampleLastInSequence: string;
    type: 'sequence';
}

export interface WallQuestionSpec {
    id?: string;
    answerLimit: null;
    clue: FourByFourTextClueSpec;
    type: 'wall';
}

export interface MissingVowelsQuestionSpec {
    id?: string;
    answerLimit: number;
    clue: CompoundClueSpec;
    connection: string;
    type: 'missing-vowels';
}
type QuestionSpec = ConnectionQuestionSpec | SequenceQuestionSpec | WallQuestionSpec | MissingVowelsQuestionSpec;

interface ConnectionResult<Q extends keyof ConnectionQuestion, S extends keyof ConnectionSecrets, C extends keyof TextClue> {
    question: Omit<ConnectionQuestion, Q>;
    secrets: Omit<ConnectionSecrets, S>;
    clues: Four<{ id: string; data: Omit<TextClue, C>; }>;
    type: 'connection';
}
type NewConnectionResult = ConnectionResult<
    'clueIds'|'connection',
    never,
    'questionId'|'revealedAt'|'closedAt'
>;
type DeltaConnectionResult = ConnectionResult<
    'clueIds'|'connection'|'isRevealed'|'type',
    'type',
    'questionId'|'revealedAt'|'closedAt'|'isRevealed'|'type'
>;

interface SequenceResult<Q extends keyof SequenceQuestion, S extends keyof SequenceSecrets, C extends keyof TextClue> {
    question: Omit<SequenceQuestion, Q>;
    secrets: Omit<SequenceSecrets, S>;
    clues: Three<{ id: string; data: Omit<TextClue, C>; }>;
    type: 'sequence';
}
type NewSequenceResult = SequenceResult<
    'clueIds'|'connection'|'exampleLastInSequence',
    never,
    'questionId'|'revealedAt'|'closedAt'
>;
type DeltaSequenceResult = SequenceResult<
    'clueIds'|'connection'|'exampleLastInSequence'|'isRevealed'|'type',
    'type',
    'questionId'|'revealedAt'|'closedAt'|'isRevealed'|'type'
>;

interface WallResult<Q extends keyof WallQuestion, S extends keyof WallSecrets, C extends keyof FourByFourTextClue> {
    question: Omit<WallQuestion, Q>;
    secrets: Omit<WallSecrets, S>;
    clue: { id: string; data: Omit<FourByFourTextClue, C>; };
    type: 'wall';
}
type NewWallResult = WallResult<
    'clueId'|'connections', 
    never,
    'questionId'|'closedAt'|'revealedAt'|'solution'
>;
type DeltaWallResult = WallResult<
    'clueId'|'connections'|'isRevealed'|'type',
    'type', 
    'questionId'|'closedAt'|'revealedAt'|'solution'|'isRevealed'|'type'
>;

interface MissingVowelsResult<Q extends keyof MissingVowelsQuestion, S extends keyof MissingVowelsSecrets, C extends keyof CompoundTextClue> {
    question: Omit<MissingVowelsQuestion, Q>;
    secrets: Omit<MissingVowelsSecrets, S>;
    clue: { id: string; data: Omit<CompoundTextClue, C>; };
    type: 'missing-vowels';
}
type NewMissingVowelsResult = MissingVowelsResult<'clueId'|'connection', never, 'questionId'|'revealedAt'|'closedAt'>;
type DeltaMissingVowelsResult = MissingVowelsResult<'clueId'|'connection'|'isRevealed', never, 'questionId'|'revealedAt'|'closedAt'|'isRevealed'>;

type Result = NewConnectionResult | DeltaConnectionResult |
    NewSequenceResult | DeltaSequenceResult |
    NewWallResult | DeltaWallResult |
    NewMissingVowelsResult | DeltaMissingVowelsResult;

export function newFromSpec(spec: ConnectionQuestionSpec): NewConnectionResult;
export function newFromSpec(spec: SequenceQuestionSpec): NewSequenceResult;
export function newFromSpec(spec: ConnectionQuestionSpec|SequenceQuestionSpec): NewConnectionResult|NewSequenceResult;
export function newFromSpec(spec: WallQuestionSpec): NewWallResult;
export function newFromSpec(spec: MissingVowelsQuestionSpec): NewMissingVowelsResult;
export function newFromSpec(spec: QuestionSpec): Result {
    if (spec.type === 'connection') {
        return newConnection(spec as ConnectionQuestionSpec);
    } else if (spec.type === 'sequence') {
        return newSequence(spec as SequenceQuestionSpec);
    } else if (spec.type === 'wall') {
        return newWall(spec as WallQuestionSpec);
    } else {
        return newMissingVowels(spec as MissingVowelsQuestionSpec);
    }
}

export function deltaFromSpec(spec: ConnectionQuestionSpec): DeltaConnectionResult;
export function deltaFromSpec(spec: SequenceQuestionSpec): DeltaSequenceResult;
export function deltaFromSpec(spec: WallQuestionSpec): DeltaWallResult;
export function deltaFromSpec(spec: MissingVowelsQuestionSpec): DeltaMissingVowelsResult;
export function deltaFromSpec(spec: QuestionSpec): DeltaConnectionResult|DeltaSequenceResult|DeltaWallResult|DeltaMissingVowelsResult;
export function deltaFromSpec(spec: QuestionSpec): Result {
    if (spec.type === 'connection') {
        return deltaConnection(spec as ConnectionQuestionSpec);
    } else if (spec.type === 'sequence') {
        return deltaSequence(spec as SequenceQuestionSpec);
    } else if (spec.type === 'wall') {
        return deltaWall(spec as WallQuestionSpec);
    } else {
        return deltaMissingVowels(spec as MissingVowelsQuestionSpec);
    }
}

function newConnection(spec: ConnectionQuestionSpec): NewConnectionResult {
    const result = deltaConnection(spec);
    return {
        question: { ...result.question, type: spec.type, isRevealed: false },
        secrets: { ...result.secrets, type: spec.type },
        clues: result.clues.map((c): NewConnectionResult['clues'][0] => ({
            id: c.id,
            data: {
                ...c.data,
                isRevealed: false,
                type: spec.clues[0].type,
            },
        })) as Four<NewConnectionResult['clues'][0]>,
        type: result.type,
    };
}
function deltaConnection(spec: ConnectionQuestionSpec): DeltaConnectionResult {
    const question: DeltaConnectionResult['question'] = {
        answerLimit: spec.answerLimit,
    };
    const secrets: DeltaConnectionResult['secrets'] = {
        connection: spec.connection,
    };
    const clues: DeltaConnectionResult['clues'] = [
        {
            id: spec.clues[0].id!,
            data: {
                answerLimit: spec.clues[0].answerLimit,
                text: spec.clues[0].text,
            }
        },
        {
            id: spec.clues[1].id!,
            data: {
                answerLimit: spec.clues[1].answerLimit,
                text: spec.clues[1].text,
            }
        },
        {
            id: spec.clues[2].id!,
            data: {
                answerLimit: spec.clues[2].answerLimit,
                text: spec.clues[2].text,
            }
        },
        {
            id: spec.clues[3].id!,
            data: {
                answerLimit: spec.clues[3].answerLimit,
                text: spec.clues[3].text,
            }
        },
    ];
    return { question, secrets, clues, type: 'connection' };
}

function newSequence(spec: SequenceQuestionSpec): NewSequenceResult {
    const result = deltaSequence(spec);
    return {
        question: { ...result.question, isRevealed: false, type: spec.type },
        secrets: { ...result.secrets, type: spec.type },
        clues: result.clues.map((c): NewConnectionResult['clues'][0] => ({
            id: c.id,
            data: {
                ...c.data,
                isRevealed: false,
                type: spec.clues[0].type,
            },
        })) as Three<NewConnectionResult['clues'][0]>,
        type: result.type,
    };
}
function deltaSequence(spec: SequenceQuestionSpec): DeltaSequenceResult {
    const question: DeltaSequenceResult['question'] = {
        answerLimit: spec.answerLimit,
    };
    const secrets: DeltaSequenceResult['secrets'] = {
        connection: spec.connection,
        exampleLastInSequence: spec.exampleLastInSequence,
    };
    const clues: DeltaSequenceResult['clues'] = [
        {
            id: spec.clues[0].id!,
            data: {
                answerLimit: spec.clues[0].answerLimit,
                text: spec.clues[0].text,
            }
        },
        {
            id: spec.clues[1].id!,
            data: {
                answerLimit: spec.clues[1].answerLimit,
                text: spec.clues[1].text,
            }
        },
        {
            id: spec.clues[2].id!,
            data: {
                answerLimit: spec.clues[2].answerLimit,
                text: spec.clues[2].text,
            }
        },
    ];
    return { question, secrets, clues, type: 'sequence' };
}

function newWall(spec: WallQuestionSpec): NewWallResult {
    const result = deltaWall(spec);
    return {
        question: { ...result.question, isRevealed: false, type: spec.type },
        secrets: { ...result.secrets, type: spec.type },
        clue: { id: result.clue.id, data: { ...result.clue.data, isRevealed: false, type: spec.clue.type } },
        type: result.type,
    };
}
function deltaWall(spec: WallQuestionSpec): DeltaWallResult {
    const question: DeltaWallResult['question'] = {
        answerLimit: spec.answerLimit,
    };
    const secrets: DeltaWallResult['secrets'] = {
        connections: spec.clue.connections,
        solution: spec.clue.solution,
    };
    const flattenedTexts = spec.clue.solution.flatMap((group) => group.texts) as Sixteen<string>;
    shuffleArray(flattenedTexts);
    const clue: DeltaWallResult['clue'] = {
        id: spec.clue.id!,
        data: {
            answerLimit: spec.clue.answerLimit,
            texts: flattenedTexts,
        },
    };
    return { question, secrets, clue, type: 'wall' };
}

function newMissingVowels(spec: MissingVowelsQuestionSpec): NewMissingVowelsResult {
    const result = deltaMissingVowels(spec);
    return {
        question: { ...result.question, isRevealed: false },
        secrets: result.secrets,
        clue: { id: result.clue.id, data: { ...result.clue.data, isRevealed: false, } },
        type: result.type,
    };
}

function deltaMissingVowels(spec: MissingVowelsQuestionSpec): DeltaMissingVowelsResult {
    const question: DeltaMissingVowelsResult['question'] = {
        type: spec.type,
        answerLimit: spec.answerLimit,
    };
    const secrets: DeltaMissingVowelsResult['secrets'] = {
        type: spec.type,
        connection: spec.connection,
    };
    const clue: DeltaMissingVowelsResult['clue'] = {
        id: spec.clue.id!,
        data: {
            type: spec.clue.type,
            answerLimit: spec.clue.answerLimit,
            texts: spec.clue.texts,
        },
    };
    return { question, secrets, clue, type: 'missing-vowels' };
}