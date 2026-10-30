import { describe, expect, it } from 'vitest';
import { collectLessonNotes } from '../utils/lessonNotes';
import {
  applyQuestAnswer,
  closeLiveQuest,
  emptyQuestBook,
  openQuestBook,
  publicQuestList,
  publicScores,
  publicTally,
} from '../utils/questRoom';
import { isQuestCommand, parseQuestPack, publishQuest } from '../utils/questSchema';
import type { QuestDraft } from '../types';

function question(n: number, lessonPart = `Part ${n}`): QuestDraft['questions'][number] {
  return {
    question: `Question ${n}?`,
    options: [`A${n}`, `B${n}`, `C${n}`, `D${n}`],
    correctAnswerIndex: 1,
    explanation: `Because ${n}`,
    lessonPart,
  };
}

function draft(): QuestDraft {
  return {
    questTitle: 'Leaf quest',
    bossName: 'Clay sprout',
    questions: [1, 2, 3, 4, 5].map((n) => question(n)),
  };
}

describe('quest pack', () => {
  it('keeps the quest fields and drops a key', () => {
    const parsed = parseQuestPack({
      ...draft(),
      apiKey: 'super-secret-key',
      geminiApiKey: 'super-secret-key',
    });
    expect(parsed.questTitle).toBe('Leaf quest');
    expect(parsed.questions).toHaveLength(5);
    expect(parsed.questions[0].lessonPart).toBe('Part 1');
    expect(JSON.stringify(parsed)).not.toContain('super-secret-key');
  });

  it('fills a missing lesson part and rejects a short quest', () => {
    const raw = draft();
    delete (raw.questions[0] as { lessonPart?: string }).lessonPart;
    expect(parseQuestPack(raw).questions[0].lessonPart).toBe('This lesson');
    expect(() => parseQuestPack({ ...draft(), questions: draft().questions.slice(0, 4) })).toThrow(/5/);
  });

  it('recognises the teacher phrase', () => {
    expect(isQuestCommand('make a quiz from this')).toBe(true);
    expect(isQuestCommand('  Make a quest from this. ')).toBe(true);
    expect(isQuestCommand('please make a quiz')).toBe(false);
  });
});

describe('lesson notes', () => {
  it('collects board text and skips image data and secret fields', () => {
    const notes = collectLessonNotes({
      canvas: {
        objects: [
          { text: 'Leaf veins' },
          { text: 'data:image/png;base64,abc' },
          { geminiApiKey: 'super-secret-key' },
        ],
      },
      mindmapNodes: [{ text: 'Photosynthesis' }],
    });
    expect(notes).toContain('Leaf veins');
    expect(notes).toContain('Photosynthesis');
    expect(notes).not.toContain('super-secret-key');
    expect(notes).not.toContain('base64');
  });
});

describe('live tally', () => {
  it('counts the open quest only and hides names until it ends', () => {
    const older = publishQuest(draft(), 'older');
    const live = publishQuest(draft(), 'live');
    let book = openQuestBook(openQuestBook(emptyQuestBook(), older), live);

    book = applyQuestAnswer(book, {
      questId: 'older',
      studentId: 'phone-a',
      displayName: 'Priya',
      questionIndex: 0,
      optionIndex: 0,
      mode: 'fight',
      score: 100,
      finished: false,
      runId: 'run-a',
    }).book;

    let tally = publicTally(book);
    expect(tally).toEqual({
      questId: 'live',
      openQuestionIndex: 0,
      counts: [0, 0, 0, 0],
    });
    expect(JSON.stringify(tally)).not.toContain('Priya');
    expect(publicScores(book)).toBeNull();

    book = applyQuestAnswer(book, {
      questId: 'live',
      studentId: 'phone-a',
      displayName: 'Priya',
      questionIndex: 0,
      optionIndex: 2,
      mode: 'fight',
      score: 100,
      finished: false,
      runId: 'run-a',
    }).book;
    book = applyQuestAnswer(book, {
      questId: 'live',
      studentId: 'phone-a',
      displayName: 'Priya',
      questionIndex: 0,
      optionIndex: 1,
      mode: 'fight',
      score: 100,
      finished: false,
      runId: 'run-a',
    }).book;
    book = applyQuestAnswer(book, {
      questId: 'live',
      studentId: 'phone-b',
      displayName: 'Arun',
      questionIndex: 0,
      optionIndex: 2,
      mode: 'listen',
      score: 0,
      finished: false,
      runId: 'run-b',
    }).book;

    tally = publicTally(book);
    expect(tally?.counts).toEqual([0, 0, 2, 0]);
    expect(JSON.stringify(tally)).not.toMatch(/Priya|Arun|displayName|studentId/);
    expect(publicQuestList(book).quests.map((quest) => quest.id)).toEqual(['older', 'live']);
    expect(publicScores(book)).toBeNull();

    book = closeLiveQuest(book);
    expect(publicTally(book)).toBeNull();
    expect(publicScores(book)).toEqual({
      questId: 'live',
      scores: [
        { displayName: 'Arun', score: 0, mode: 'listen' },
        { displayName: 'Priya', score: 100, mode: 'fight' },
      ],
    });
  });
});
