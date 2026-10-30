export type BoardProvider = 'gemini' | 'ollama' | 'vertex';
export type BoardPreference = 'auto' | 'gemini' | 'ollama' | 'vertex';

let geminiBlocked = false;

export function isGeminiBlocked() {
  return geminiBlocked;
}

/** A capped or unpaid key is not tried again. */
export function noteGeminiFailure(message: string, status?: number) {
  const raw = `${status ?? ''} ${message}`.toLowerCase();
  if (
    status === 429 || status === 402
    || raw.includes('spending cap')
    || raw.includes('spend cap')
    || raw.includes('resource_exhausted')
    || raw.includes('prepayment')
    || raw.includes('quota')
    || raw.includes('too many')
  ) {
    geminiBlocked = true;
  }
}

/**
 * Local Ollama is the classroom path. A saved key is used only when Gemini
 * is the chosen mode, and a capped key falls through to Ollama.
 */
export function boardProviders(options: {
  preference: BoardPreference;
  hasKey: boolean;
  ollamaReady: boolean;
  cloudBlocked?: boolean;
}): BoardProvider[] {
  const blocked = options.cloudBlocked || geminiBlocked;
  if (options.preference === 'ollama') return ['ollama'];
  if (blocked) return options.ollamaReady ? ['ollama'] : ['gemini'];
  if (options.preference === 'gemini') {
    return options.ollamaReady ? ['gemini', 'ollama'] : ['gemini'];
  }
  if (options.preference === 'vertex') {
    return options.ollamaReady ? ['vertex', 'ollama'] : ['vertex'];
  }
  return options.ollamaReady ? ['ollama'] : (options.hasKey ? ['gemini'] : ['ollama']);
}

export function localModelName(selected: string | undefined, installed: string[], fallback: string) {
  const names = installed.map((name) => name.toLowerCase());
  const wanted = (selected || '').trim();
  if (wanted && names.includes(wanted.toLowerCase())) return wanted;
  if (names.includes(fallback.toLowerCase())) return fallback;
  return wanted || fallback;
}
