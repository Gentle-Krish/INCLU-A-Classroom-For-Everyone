import { CHALK_LOCAL_DOWNLOAD_MODEL } from '../constants';

/** Ollama tag sent to the existing pull route. Screen copy says "local model". */
export const LOCAL_MODEL_TAG = CHALK_LOCAL_DOWNLOAD_MODEL;
export const SETUP_DISMISS_KEY = 'chalk-local-model-setup-dismissed';

export type LocalDownloadPhase = 'started' | 'pulling' | 'done' | 'failed' | 'not_installed';

export interface LocalDownloadUpdate {
  phase: LocalDownloadPhase;
  status: string;
  percent: number | null;
  error?: string;
}

export class OllamaNotInstalledError extends Error {
  readonly code = 'ollama_not_installed';
}

export function visibleModelText(text: string): string {
  return text.replace(/\b[\w.-]*gemma[\w.:-]*/gi, 'local model');
}

function describePull(status: string, percent: number | null): { phase: 'started' | 'pulling' | 'done'; status: string } {
  const lower = status.toLowerCase();
  if (lower === 'success' || lower === 'done') {
    return { phase: 'done', status: 'The local model is ready.' };
  }
  if (lower === 'started') {
    return { phase: 'started', status: 'Download started' };
  }
  if (lower.includes('manifest') || lower.includes('pull')) {
    return { phase: 'pulling', status: 'Pulling the local model' };
  }
  if (percent != null || lower.includes('download') || lower.includes('writing') || lower.includes('verifying')) {
    return { phase: 'pulling', status: 'Downloading the local model' };
  }
  return { phase: 'pulling', status: visibleModelText(status || 'Pulling the local model') };
}

export async function probeLocalModel(ollamaUrl?: string): Promise<{ ollamaRunning: boolean; modelReady: boolean }> {
  const response = await fetch('/api/ai/pull-model', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ probe: true, model: LOCAL_MODEL_TAG, ollamaUrl })
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 503 || data.code === 'ollama_not_installed' || data.ollamaRunning === false) {
    return { ollamaRunning: false, modelReady: false };
  }
  if (!response.ok) {
    throw new Error(visibleModelText(String(data.error || 'Could not check whether Ollama is running on this laptop.')));
  }
  return { ollamaRunning: true, modelReady: !!data.modelReady };
}

export async function pullLocalModel(
  onUpdate: (update: LocalDownloadUpdate) => void,
  ollamaUrl?: string
): Promise<void> {
  const response = await fetch('/api/ai/pull-model', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream'
    },
    body: JSON.stringify({ model: LOCAL_MODEL_TAG, ollamaUrl, stream: true })
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream')) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 503 || data.code === 'ollama_not_installed') {
      throw new OllamaNotInstalledError('Ollama is not installed or is not running on this laptop. The download did not start.');
    }
    throw new Error(visibleModelText(String(data.error || 'The local model download failed.')));
  }

  onUpdate({ phase: 'started', status: 'Download started', percent: null });

  if (!response.body) {
    throw new Error('The local model download failed. Ollama did not send download progress.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finished = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const jsonStr = line.replace(/^data:\s*/, '').trim();
      if (!jsonStr) continue;
      let data: any;
      try {
        data = JSON.parse(jsonStr);
      } catch {
        continue;
      }
      if (data.error) {
        onUpdate({
          phase: 'failed',
          status: 'The local model download failed.',
          percent: null,
          error: visibleModelText(String(data.error))
        });
        finished = true;
        return;
      }
      const percent = typeof data.percent === 'number' ? data.percent : null;
      if (data.status === 'success' || data.completed === true || data.phase === 'done') {
        onUpdate({ phase: 'done', status: 'The local model is ready.', percent: 100 });
        finished = true;
        return;
      }
      if (data.status === 'started' || data.phase === 'started') {
        onUpdate({ phase: 'started', status: 'Download started', percent: null });
        continue;
      }
      const described = describePull(String(data.status || ''), percent);
      onUpdate({ phase: described.phase, status: described.status, percent });
    }
  }

  if (!finished) {
    onUpdate({
      phase: 'failed',
      status: 'The local model download failed.',
      percent: null,
      error: 'The local model download failed. The download stopped before it finished.'
    });
  }
}
