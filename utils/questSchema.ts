// Copyright (c) 2026 QuestSloth contributors
// Quest JSON shape and parsing adapted from QuestSloth src/lib/questSchema.ts.

import type { QuestDraft, QuestPack, QuestQuestion } from '../types';

export const QUESTIONS_PER_QUEST = 5;
export const MAX_NOTES_CHARS = 2800;

const QUEST_COMMAND = /^\s*make a (quiz|quest) from this[.!?]*\s*$/i;

export function isQuestCommand(prompt: string): boolean {
  return QUEST_COMMAND.test(prompt);
}

function clip(value: unknown, max: number): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('Model response did not contain valid JSON');
  }
}

function normalizeOptions(options: unknown): [string, string, string, string] {
  if (!Array.isArray(options) || options.length < 4) {
    throw new Error('Each question needs exactly 4 options');
  }
  const cleaned = options.slice(0, 4).map((option) => clip(option, 120));
  if (cleaned.some((option) => option.length === 0)) {
    throw new Error('Each question needs exactly 4 options');
  }
  return [cleaned[0], cleaned[1], cleaned[2], cleaned[3]];
}

/** Keeps the quest fields only. A key or other extra property is dropped. */
export function parseQuestPack(raw: string | unknown): QuestDraft {
  const data = typeof raw === 'string' ? extractJsonObject(raw) : raw;
  if (!data || typeof data !== 'object') {
    throw new Error('Quest pack must be a JSON object');
  }

  const obj = data as Record<string, unknown>;
  const questionsRaw = Array.isArray(obj.questions) ? obj.questions : [];
  const questions: QuestQuestion[] = questionsRaw.slice(0, QUESTIONS_PER_QUEST).map((entry) => {
    const item = entry as Record<string, unknown>;
    const index = Number(item.correctAnswerIndex ?? item.correct_answer_index ?? 0);
    const question = clip(item.question, 280);
    const explanation = clip(item.explanation, 400);
    if (!question || !explanation) {
      throw new Error('Each question needs text and an explanation');
    }
    return {
      question,
      options: normalizeOptions(item.options),
      correctAnswerIndex: Number.isFinite(index) ? Math.max(0, Math.min(3, Math.trunc(index))) : 0,
      explanation,
      lessonPart: clip(item.lessonPart ?? item.lesson_part, 80) || 'This lesson',
    };
  });

  if (questions.length !== QUESTIONS_PER_QUEST) {
    throw new Error(`Quest must contain exactly ${QUESTIONS_PER_QUEST} questions`);
  }

  const questTitle = clip(obj.questTitle ?? obj.levelName, 80) || 'Class quest';
  const bossName = clip(obj.bossName, 40) || 'Clay friend';
  return { questTitle, bossName, questions };
}

export function publishQuest(draft: QuestDraft, id = newQuestId()): QuestPack {
  return {
    id,
    questTitle: draft.questTitle,
    bossName: draft.bossName,
    questions: draft.questions.map((question) => ({ ...question, options: [...question.options] })),
  };
}

export function newQuestId(): string {
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
