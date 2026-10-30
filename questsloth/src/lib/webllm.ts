import {
  CreateMLCEngine,
  type InitProgressReport,
  type MLCEngine,
} from '@mlc-ai/web-llm'
import type { QuestPack } from '../types/quest'
import { MAX_NOTES_CHARS } from '../types/quest'
import { parseQuestPack, questJsonSchema } from './questSchema'

/** Prefers f16 (less VRAM); falls back to f32 when shader-f16 is unavailable. */
const MODEL_F16 = 'gemma-2-2b-it-q4f16_1-MLC-1k'
const MODEL_F32 = 'gemma-2-2b-it-q4f32_1-MLC'

let selectedModelId = MODEL_F16
let selectedModelLabel =
  'Gemma 2 2B IT (WebLLM q4f16, 1k context)'

/** @deprecated use getModelId() — kept for call sites that read a constant */
export const MODEL_ID = MODEL_F16
/** @deprecated use getModelLabel() */
export const MODEL_LABEL = selectedModelLabel

let enginePromise: Promise<MLCEngine> | null = null
let engine: MLCEngine | null = null

export type LoadProgress = {
  progress: number
  text: string
}

export function getModelId() {
  return selectedModelId
}

export function getModelLabel() {
  return selectedModelLabel
}

export async function hasWebGPU(): Promise<boolean> {
  if (!navigator.gpu) return false
  try {
    const adapter = await navigator.gpu.requestAdapter()
    return adapter !== null
  } catch {
    return false
  }
}

/** True when the GPU adapter advertises the shader-f16 feature WebLLM f16 builds need. */
export async function hasShaderF16(): Promise<boolean> {
  if (!navigator.gpu) return false
  try {
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) return false
    return adapter.features.has('shader-f16')
  } catch {
    return false
  }
}

async function pickModel(): Promise<{ id: string; label: string }> {
  const f16 = await hasShaderF16()
  if (f16) {
    return {
      id: MODEL_F16,
      label: 'Gemma 2 2B IT (WebLLM q4f16, 1k context)',
    }
  }
  return {
    id: MODEL_F32,
    label: 'Gemma 2 2B IT (WebLLM q4f32 — no shader-f16 on this GPU)',
  }
}

function isShaderF16Error(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err)
  return /shader-f16|f16/i.test(msg)
}

export function isEngineReady() {
  return engine !== null
}

export async function loadEngine(
  onProgress?: (report: LoadProgress) => void,
): Promise<MLCEngine> {
  if (engine) return engine
  if (enginePromise) return enginePromise

  const supported = await hasWebGPU()
  if (!supported) {
    throw new Error(
      'WebGPU is required to run Gemma in the browser. Use recent Chrome or Edge.',
    )
  }

  const picked = await pickModel()
  selectedModelId = picked.id
  selectedModelLabel = picked.label

  enginePromise = (async () => {
    const tryCreate = async (modelId: string) =>
      CreateMLCEngine(modelId, {
        initProgressCallback: (report: InitProgressReport) => {
          onProgress?.({
            progress: report.progress,
            text: `${selectedModelLabel}: ${report.text}`,
          })
        },
      })

    try {
      const created = await tryCreate(selectedModelId)
      engine = created
      return created
    } catch (err) {
      // Probe can miss; if f16 fails, retry the f32 build once.
      if (selectedModelId === MODEL_F16 && isShaderF16Error(err)) {
        selectedModelId = MODEL_F32
        selectedModelLabel =
          'Gemma 2 2B IT (WebLLM q4f32 — shader-f16 unavailable)'
        onProgress?.({
          progress: 0,
          text: 'shader-f16 missing — retrying with q4f32 Gemma…',
        })
        try {
          const created = await tryCreate(MODEL_F32)
          engine = created
          return created
        } catch (retryErr) {
          enginePromise = null
          throw retryErr
        }
      }
      enginePromise = null
      throw err
    }
  })()

  return enginePromise
}

function buildSystemPrompt() {
  return `You are QuestSloth Teacher Forge. Convert lecture notes into a gamified dungeon quiz pack.
Reply with ONLY valid JSON matching this schema (no markdown, no commentary):
{
  "questTitle": string,
  "bossName": string,
  "questions": [
    {
      "question": string,
      "options": [string, string, string, string],
      "correctAnswerIndex": 0|1|2|3,
      "explanation": string
    }
  ]
}
Rules:
- Exactly 5 questions.
- Exactly 4 options per question.
- correctAnswerIndex is the 0-based index of the right option.
- Explanations teach the concept briefly.
- Theme names like a playful dungeon (boss + quest title).
- Base every question on the provided notes.`
}

function buildUserPrompt(notes: string) {
  const clipped = notes.trim().slice(0, MAX_NOTES_CHARS)
  return `Lecture notes:\n"""\n${clipped}\n"""\n\nGenerate the quest pack JSON now.`
}

async function completeJson(mlc: MLCEngine, notes: string, repairHint?: string) {
  const userContent = repairHint
    ? `${buildUserPrompt(notes)}\n\nPrevious output was invalid: ${repairHint}\nReturn corrected JSON only.`
    : buildUserPrompt(notes)

  const reply = await mlc.chat.completions.create({
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: userContent },
    ],
    temperature: 0.15,
    max_tokens: 900,
    response_format: {
      type: 'json_object',
      schema: JSON.stringify(questJsonSchema),
    },
  })

  const content = reply.choices[0]?.message?.content
  if (!content || typeof content !== 'string') {
    throw new Error('Model returned an empty response')
  }
  return content
}

export async function generateQuestPack(
  notes: string,
  onProgress?: (report: LoadProgress) => void,
): Promise<QuestPack> {
  if (!notes.trim()) {
    throw new Error('Paste some lecture notes first.')
  }

  const mlc = await loadEngine(onProgress)
  let raw = await completeJson(mlc, notes)

  try {
    return parseQuestPack(raw)
  } catch (firstError) {
    const hint =
      firstError instanceof Error ? firstError.message : 'schema mismatch'
    raw = await completeJson(mlc, notes, hint)
    return parseQuestPack(raw)
  }
}
