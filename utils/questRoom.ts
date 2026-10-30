import type {
  ClassQuestBook,
  PublicQuestList,
  QuestAttempt,
  QuestPack,
  QuestPlayMode,
  QuestScoreBoard,
  QuestTally,
  StudentAsk,
} from '../types';

const QUESTIONS = 5;
const MAX_QUESTS = 8;
const MAX_ASKS = 30;
const MAX_ASK_CHARS = 240;

export function emptyQuestBook(): ClassQuestBook {
  return {
    quests: [],
    liveQuestId: null,
    closed: {},
    cursor: {},
    attempts: {},
    asks: [],
  };
}

export function openQuestBook(book: ClassQuestBook, pack: QuestPack): ClassQuestBook {
  const quests = [...book.quests, pack].slice(-MAX_QUESTS);
  const kept = new Set(quests.map((quest) => quest.id));
  const attempts: ClassQuestBook['attempts'] = {};
  for (const id of Object.keys(book.attempts)) {
    if (kept.has(id)) attempts[id] = book.attempts[id];
  }
  const closed: Record<string, boolean> = {};
  for (const id of Object.keys(book.closed)) {
    if (kept.has(id)) closed[id] = book.closed[id];
  }
  closed[pack.id] = false;
  const cursor = { ...book.cursor };
  for (const id of Object.keys(cursor)) {
    if (!kept.has(id)) delete cursor[id];
  }
  cursor[pack.id] = 0;
  return {
    quests,
    liveQuestId: pack.id,
    closed,
    cursor,
    attempts,
    asks: book.asks,
  };
}

export function closeLiveQuest(book: ClassQuestBook): ClassQuestBook {
  if (!book.liveQuestId) return book;
  return {
    ...book,
    closed: { ...book.closed, [book.liveQuestId]: true },
  };
}

export interface QuestAnswerInput {
  questId: string;
  studentId: string;
  displayName: string;
  questionIndex: number;
  optionIndex: number;
  mode: QuestPlayMode;
  score: number;
  finished: boolean;
  runId: string;
}

export interface QuestAnswerResult {
  book: ClassQuestBook;
  changed: boolean;
  tally: boolean;
  scores: boolean;
}

function blankAttempt(input: QuestAnswerInput): QuestAttempt {
  return {
    studentId: input.studentId,
    displayName: input.displayName,
    mode: input.mode,
    runId: input.runId,
    choices: [null, null, null, null, null],
    score: 0,
    finished: false,
  };
}

export function applyQuestAnswer(book: ClassQuestBook, input: QuestAnswerInput): QuestAnswerResult {
  const unchanged = { book, changed: false, tally: false, scores: false };
  if (!book.quests.some((quest) => quest.id === input.questId)) return unchanged;
  if (!input.studentId || !input.runId || input.runId.length > 40) return unchanged;
  if (!Number.isInteger(input.questionIndex) || input.questionIndex < 0 || input.questionIndex >= QUESTIONS) return unchanged;
  if (!Number.isInteger(input.optionIndex) || input.optionIndex < 0 || input.optionIndex > 3) return unchanged;
  if (input.mode !== 'fight' && input.mode !== 'listen') return unchanged;

  const prior = book.attempts[input.questId]?.[input.studentId];
  const fresh = !prior || prior.runId !== input.runId;
  const attempt = fresh ? blankAttempt(input) : { ...prior, choices: [...prior.choices] };
  if (attempt.choices[input.questionIndex] != null) return unchanged;

  attempt.choices[input.questionIndex] = input.optionIndex;
  attempt.mode = input.mode;
  attempt.displayName = input.displayName;
  attempt.score = Math.max(0, Math.min(10000, Math.round(Number(input.score) || 0)));
  attempt.finished = input.finished === true || attempt.finished;

  const isLive = book.liveQuestId === input.questId;
  const isClosed = !!book.closed[input.questId];
  const attempts = {
    ...book.attempts,
    [input.questId]: {
      ...(book.attempts[input.questId] ?? {}),
      [input.studentId]: attempt,
    },
  };
  const cursor = isLive && !isClosed
    ? { ...book.cursor, [input.questId]: input.questionIndex }
    : book.cursor;

  return {
    book: { ...book, attempts, cursor },
    changed: true,
    tally: isLive && !isClosed,
    scores: isLive && isClosed,
  };
}

export function countOptions(
  book: ClassQuestBook,
  questId: string,
  questionIndex: number,
): [number, number, number, number] {
  const counts: [number, number, number, number] = [0, 0, 0, 0];
  const attempts = book.attempts[questId] ?? {};
  for (const attempt of Object.values(attempts)) {
    const choice = attempt.choices[questionIndex];
    if (choice === 0 || choice === 1 || choice === 2 || choice === 3) counts[choice] += 1;
  }
  return counts;
}

/** The live question while the quest is open. Null after the teacher ends it. */
export function publicTally(book: ClassQuestBook): QuestTally | null {
  const questId = book.liveQuestId;
  if (!questId || book.closed[questId]) return null;
  if (!book.quests.some((quest) => quest.id === questId)) return null;
  const openQuestionIndex = book.cursor[questId] ?? 0;
  return {
    questId,
    openQuestionIndex,
    counts: countOptions(book, questId, openQuestionIndex),
  };
}

/** Names appear only after the live quest is closed. */
export function publicScores(book: ClassQuestBook): QuestScoreBoard | null {
  const questId = book.liveQuestId;
  if (!questId || !book.closed[questId]) return null;
  const scores = Object.values(book.attempts[questId] ?? {})
    .map((attempt) => ({
      displayName: attempt.displayName,
      score: attempt.score,
      mode: attempt.mode,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName) || b.score - a.score);
  return { questId, scores };
}

export function publicQuestList(book: ClassQuestBook): PublicQuestList {
  return {
    liveQuestId: book.liveQuestId,
    liveClosed: book.liveQuestId ? !!book.closed[book.liveQuestId] : false,
    quests: book.quests,
  };
}

export function normalizeStudentAsk(
  input: unknown,
  student: { displayName: string },
): StudentAsk | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const text = String(raw.text ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_ASK_CHARS);
  if (!text) return null;
  const lessonPart = String(raw.lessonPart ?? '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Class';
  const displayName = student.displayName.replace(/\s+/g, ' ').trim().slice(0, 40);
  if (!displayName) return null;
  return {
    id: `ask_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    displayName,
    text,
    lessonPart,
  };
}

export function addStudentAsk(book: ClassQuestBook, ask: StudentAsk): ClassQuestBook {
  return { ...book, asks: [...book.asks, ask].slice(-MAX_ASKS) };
}

export function attachAskAnswer(book: ClassQuestBook, id: string, answer: string): ClassQuestBook {
  const text = answer.replace(/\s+/g, ' ').trim().slice(0, 600);
  if (!text) return book;
  return {
    ...book,
    asks: book.asks.map((ask) => (ask.id === id ? { ...ask, answer: text } : ask)),
  };
}
