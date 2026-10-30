import { MAX_NOTES_CHARS } from './questSchema';

export interface LessonNoteSource {
  canvas?: unknown;
  mindmapNodes?: { text?: string }[];
  messages?: { text?: string }[];
}

const TEXT_KEYS = new Set(['text', 'title', 'label']);

function visit(value: unknown, key: string | undefined, chunks: string[]) {
  if (typeof value === 'string') {
    if (!key || !TEXT_KEYS.has(key)) return;
    const trimmed = value.replace(/\s+/g, ' ').trim();
    if (!trimmed || trimmed.startsWith('data:')) return;
    chunks.push(trimmed);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) visit(item, undefined, chunks);
    return;
  }
  if (value && typeof value === 'object') {
    for (const [childKey, child] of Object.entries(value as Record<string, unknown>)) {
      visit(child, childKey, chunks);
    }
  }
}

/** Diagram labels, notes, and the latest board chat, capped for the quest writer. */
export function collectLessonNotes(source: LessonNoteSource): string {
  const chunks: string[] = [];
  if (source.canvas) visit(source.canvas, undefined, chunks);
  for (const node of source.mindmapNodes ?? []) {
    if (node.text) chunks.push(node.text.replace(/\s+/g, ' ').trim());
  }
  for (const message of (source.messages ?? []).slice(-6)) {
    if (message.text) chunks.push(message.text.replace(/\s+/g, ' ').trim());
  }
  return chunks.filter(Boolean).join('\n').slice(0, MAX_NOTES_CHARS);
}
