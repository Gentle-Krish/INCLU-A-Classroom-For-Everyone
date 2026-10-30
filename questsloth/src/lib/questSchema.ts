import { z } from 'zod'
import type { QuestPack } from '../types/quest'
import { QUESTIONS_PER_QUEST } from '../types/quest'

const questionSchema = z.object({
  question: z.string().min(1),
  options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  correctAnswerIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
})

export const questPackSchema = z.object({
  questTitle: z.string().min(1),
  bossName: z.string().min(1),
  questions: z.array(questionSchema).length(QUESTIONS_PER_QUEST),
})

/** JSON Schema passed to WebLLM constrained decoding */
export const questJsonSchema = {
  type: 'object',
  properties: {
    questTitle: { type: 'string' },
    bossName: { type: 'string' },
    questions: {
      type: 'array',
      minItems: QUESTIONS_PER_QUEST,
      maxItems: QUESTIONS_PER_QUEST,
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          options: {
            type: 'array',
            minItems: 4,
            maxItems: 4,
            items: { type: 'string' },
          },
          correctAnswerIndex: { type: 'integer', minimum: 0, maximum: 3 },
          explanation: { type: 'string' },
        },
        required: ['question', 'options', 'correctAnswerIndex', 'explanation'],
      },
    },
  },
  required: ['questTitle', 'bossName', 'questions'],
} as const

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1))
    }
    throw new Error('Model response did not contain valid JSON')
  }
}

function normalizeOptions(options: unknown): [string, string, string, string] {
  if (!Array.isArray(options) || options.length < 4) {
    throw new Error('Each question needs exactly 4 options')
  }
  const cleaned = options.slice(0, 4).map((o) => String(o).trim())
  return [cleaned[0], cleaned[1], cleaned[2], cleaned[3]]
}

export function parseQuestPack(raw: string | unknown): QuestPack {
  const data = typeof raw === 'string' ? extractJsonObject(raw) : raw
  if (!data || typeof data !== 'object') {
    throw new Error('Quest pack must be a JSON object')
  }

  const obj = data as Record<string, unknown>
  const questionsRaw = Array.isArray(obj.questions) ? obj.questions : []

  const normalized = {
    questTitle: String(obj.questTitle ?? obj.levelName ?? 'Untitled Quest').trim(),
    bossName: String(obj.bossName ?? 'Unknown Boss').trim(),
    questions: questionsRaw.slice(0, QUESTIONS_PER_QUEST).map((q) => {
      const item = q as Record<string, unknown>
      const index = Number(item.correctAnswerIndex ?? item.correct_answer_index ?? 0)
      return {
        question: String(item.question ?? '').trim(),
        options: normalizeOptions(item.options),
        correctAnswerIndex: Number.isFinite(index)
          ? Math.max(0, Math.min(3, Math.trunc(index)))
          : 0,
        explanation: String(item.explanation ?? '').trim(),
      }
    }),
  }

  if (normalized.questions.length !== QUESTIONS_PER_QUEST) {
    throw new Error(`Quest must contain exactly ${QUESTIONS_PER_QUEST} questions`)
  }

  return questPackSchema.parse(normalized)
}
