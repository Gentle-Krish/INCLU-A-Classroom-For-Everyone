import { CONFIG, CHALK_LOCAL_DOWNLOAD_MODEL, STRONG_GEMMA_MODEL } from '../constants';
import { createLogger } from '../utils/logger';
import { MAX_NOTES_CHARS, parseQuestPack } from '../utils/questSchema';
import type { QuestDraft } from '../types';

const logger = createLogger('quest-writer');

export class QuestWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuestWriteError';
  }
}

const SHAPE_ERROR = 'The quest did not come back in the right shape.';
const LOCAL_ERROR = 'The offline Chalk model is not ready.';

export interface QuestWriteInput {
  notes: string;
  geminiApiKey?: string;
  ollamaBaseUrl?: string;
  preferLocal?: boolean;
}

function usableGeminiKey(key: unknown): string {
  if (typeof key !== 'string') return '';
  const trimmed = key.trim();
  if (trimmed.length < 20) return '';
  if (/dummy|placeholder|your_gemini|your-api-key|changeme/i.test(trimmed)) return '';
  return trimmed;
}

function localOllamaUrl(customUrl?: string): string {
  const fallback = (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_URL || CONFIG.ai.ollama.defaultBaseUrl).replace(/\/$/, '');
  if (!customUrl) return fallback;
  try {
    const parsed = new URL(customUrl.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return fallback;
    const host = parsed.hostname.toLowerCase();
    if (host !== 'localhost' && host !== '127.0.0.1' && host !== '::1') return fallback;
    return parsed.origin;
  } catch {
    return fallback;
  }
}

function questPrompt(notes: string): string {
  const lesson = notes.trim() || 'The class has just started. Write a gentle quest a teacher could use.';
  return `Write a classroom quest from these lesson notes.
Write the way a teacher talks. Each question is one clear sentence about the lesson.
Do not write "which of the following" or "all of the above".
The four options are short and different. Only one is right.
The explanation is one sentence a student can read after answering.
Return only a JSON object with questTitle, bossName, and questions.
questions must be an array of exactly 5 items.
Each item has question, options (exactly 4 different strings), correctAnswerIndex (0, 1, 2, or 3), explanation, and lessonPart.
lessonPart is the short part of the lesson that question is about.
bossName is a cute clay creature.
Use English.
Lesson notes:
${lesson}`;
}

async function geminiOnce(prompt: string, key: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${STRONG_GEMMA_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4 },
      }),
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok) {
    throw new Error(`gemini_${response.status}`);
  }
  const data = await response.json() as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
  if (!text.trim()) throw new Error('gemini_empty');
  return text;
}

async function ollamaOnce(prompt: string, customUrl?: string): Promise<string> {
  const response = await fetch(`${localOllamaUrl(customUrl)}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CHALK_LOCAL_DOWNLOAD_MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      options: { temperature: 0.4 },
    }),
    signal: AbortSignal.timeout(180000),
  });
  if (!response.ok) {
    throw new QuestWriteError(LOCAL_ERROR);
  }
  const data = await response.json() as { error?: string; message?: { content?: string } };
  if (data.error) {
    logger.warn('Quest local model refused the request');
    throw new QuestWriteError(LOCAL_ERROR);
  }
  const text = data.message?.content || '';
  if (!text.trim()) throw new QuestWriteError(LOCAL_ERROR);
  return text;
}

function parseModel(text: string): QuestDraft {
  try {
    return parseQuestPack(text);
  } catch {
    throw new QuestWriteError(SHAPE_ERROR);
  }
}

/**
 * Writes a quest on the laptop. A saved Gemini key is tried once, with no retry.
 * Any failure falls through to the offline Chalk model. The key is not returned.
 */
export async function writeQuestOnLaptop(input: QuestWriteInput): Promise<QuestDraft> {
  const notes = input.notes.slice(0, MAX_NOTES_CHARS);
  const prompt = questPrompt(notes);
  if (!input.preferLocal) {
    const key = usableGeminiKey(input.geminiApiKey)
      || usableGeminiKey(process.env.GEMINI_API_KEY)
      || usableGeminiKey(process.env.API_KEY);
    if (key) {
      try {
        return parseModel(await geminiOnce(prompt, key));
      } catch (err) {
        if (err instanceof QuestWriteError) {
          logger.warn('Quest cloud response was not a quest');
        } else {
          logger.warn('Quest cloud attempt failed');
        }
      }
    }
  }

  try {
    return parseModel(await ollamaOnce(prompt, input.ollamaBaseUrl));
  } catch (err) {
    if (err instanceof QuestWriteError) throw err;
    logger.warn('Quest local model was not reachable');
    throw new QuestWriteError(LOCAL_ERROR);
  }
}

export function questResponseIsSafe(draft: QuestDraft, secret: string): boolean {
  if (!secret) return true;
  return !JSON.stringify(draft).includes(secret);
}
