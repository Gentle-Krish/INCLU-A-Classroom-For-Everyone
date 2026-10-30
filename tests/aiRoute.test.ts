import { describe, expect, it } from 'vitest';
import { boardProviders, localModelName, noteGeminiFailure, isGeminiBlocked } from '../utils/aiRoute';

describe('board provider routing', () => {
  it('keeps an explicit local choice on Ollama even when a Gemini key is saved', () => {
    expect(boardProviders({
      preference: 'ollama',
      hasKey: true,
      ollamaReady: true,
    })).toEqual(['ollama']);
  });

  it('uses the local model when it is ready and Gemini was not chosen', () => {
    expect(boardProviders({
      preference: 'auto',
      hasKey: true,
      ollamaReady: true,
    })).toEqual(['ollama']);
    expect(boardProviders({
      preference: 'vertex',
      hasKey: true,
      ollamaReady: true,
    })).toEqual(['vertex', 'ollama']);
  });

  it('does not call Gemini again after the key spending cap', () => {
    noteGeminiFailure('monthly spending cap reached', 429);
    expect(isGeminiBlocked()).toBe(true);
    expect(boardProviders({
      preference: 'gemini',
      hasKey: true,
      ollamaReady: true,
    })).toEqual(['ollama']);
  });

  it('uses the installed Chalk local model name', () => {
    expect(localModelName('chalk-model:latest', ['chalk-gemma:2b', 'gemma4:e2b'], 'chalk-gemma:2b')).toBe('chalk-gemma:2b');
    expect(localModelName('chalk-gemma:2b', ['chalk-gemma:2b'], 'chalk-gemma:2b')).toBe('chalk-gemma:2b');
  });
});
