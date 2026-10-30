export const GEMINI_MODEL = 'gemini-3.8-flash';
/** Strong Gemma used when the teacher has a Gemini API key. Not the E2B offline model. */
export const STRONG_GEMMA_MODEL = 'gemma-4-31b-it';
export const OLLAMA_MODEL = 'inclu-gemma:2b';
/** The model tag Inclu uses. Modelfile: scripts/Modelfile.inclu-gemma (FROM gemma4:e2b). */
export const CHALK_LOCAL_DOWNLOAD_MODEL = 'inclu-gemma:2b';
/** Base weight named in that Modelfile. Already-local copies must not be pulled again. */
export const CHALK_LOCAL_BASE_MODEL = 'gemma4:e2b';
export const OLLAMA_THINKING_MODE = 'nothink';
export const DEFAULT_CANVAS_COLOR = 'transparent';
export const AGENT_THINKING_BUDGET = 0;

// ─────────────────────────────────────────────────────────────────────────────
// STANDARD TYPOGRAPHY & FONT SIZES
// Consistent across the entire project (Whiteboard canvas & UI components)
// ─────────────────────────────────────────────────────────────────────────────
export type StandardFontSize = 'small' | 'medium' | 'large';

export interface FontSizeOption {
  name: StandardFontSize;
  label: string;
  uiPx: number;
  whiteboardPx: number;
  rem: string;
}

export const STANDARD_FONT_SIZES: Record<StandardFontSize, FontSizeOption> = {
  small: {
    name: 'small',
    label: 'Small',
    uiPx: 14,
    whiteboardPx: 18,
    rem: '0.875rem',
  },
  medium: {
    name: 'medium',
    label: 'Medium',
    uiPx: 18,
    whiteboardPx: 28,
    rem: '1.125rem',
  },
  large: {
    name: 'large',
    label: 'Large',
    uiPx: 24,
    whiteboardPx: 48,
    rem: '1.5rem',
  },
} as const;

export const FONT_SIZE_PRESETS = [
  STANDARD_FONT_SIZES.small,
  STANDARD_FONT_SIZES.medium,
  STANDARD_FONT_SIZES.large,
] as const;

/**
 * Resolves a font size representation to an integer pixel value.
 * Supports standard presets ('small', 'medium', 'large'), legacy aliases ('TITLE', 'SUBTITLE', 'BODY', 'CAPTION'),
 * or custom pixel specifications (e.g. 56, '56px', 'custom 56px').
 */
export function resolveFontSize(
  size?: string | number | null,
  context: 'whiteboard' | 'ui' = 'whiteboard'
): number {
  if (typeof size === 'number' && !isNaN(size)) {
    return Math.max(8, Math.min(200, Math.round(size)));
  }

  if (!size) {
    return STANDARD_FONT_SIZES.medium[context === 'whiteboard' ? 'whiteboardPx' : 'uiPx'];
  }

  const str = String(size).trim().toLowerCase();

  // Custom pixel pattern, e.g. "56px", "custom 56px", "56"
  const pxMatch = str.match(/(?:custom\s*)?(\d+)(?:\s*px)?/i);
  if (pxMatch && (str.includes('px') || str.includes('custom') || /^\d+$/.test(str))) {
    const val = parseInt(pxMatch[1], 10);
    if (!isNaN(val) && val > 0) {
      return Math.max(8, Math.min(200, val));
    }
  }

  if (str === 'small' || str === 'sm' || str === 'caption') {
    return STANDARD_FONT_SIZES.small[context === 'whiteboard' ? 'whiteboardPx' : 'uiPx'];
  }
  if (str === 'large' || str === 'lg' || str === 'title' || str === 'heading') {
    return STANDARD_FONT_SIZES.large[context === 'whiteboard' ? 'whiteboardPx' : 'uiPx'];
  }
  if (str === 'subtitle') {
    return context === 'whiteboard' ? 36 : 20;
  }
  if (str === 'medium' || str === 'med' || str === 'body' || str === 'regular' || str === 'normal') {
    return STANDARD_FONT_SIZES.medium[context === 'whiteboard' ? 'whiteboardPx' : 'uiPx'];
  }

  return STANDARD_FONT_SIZES.medium[context === 'whiteboard' ? 'whiteboardPx' : 'uiPx'];
}

export const CONFIG = {
  ai: {
    gemini: {
      model: GEMINI_MODEL,
      apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      probeTimeoutMs: 3000,
      generateTimeoutMs: 120000,
      generation: {
        temperature: 0.2,
        maxOutputTokens: 8192,
        thinkingBudget: 0,
      },
      transcription: {
        temperature: 0.1,
      },
    },
    ollama: {
      model: OLLAMA_MODEL,
      thinkingMode: OLLAMA_THINKING_MODE,
      defaultBaseUrl: 'http://localhost:11434',
      probeTimeoutMs: 1500,
      numCtx: 4096,
      generateTimeoutMs: 300000,
    },
    vertex: {
      model: 'gemini-3.8-flash',
      location: 'global',
      projectId: '',
      probeTimeoutMs: 3000,
      generateTimeoutMs: 120000,
      generation: {
        temperature: 0.2,
        maxOutputTokens: 8192,
        thinkingBudget: 0,
      },
    },
    request: {
      retryCount: 2,
      retryBaseDelayMs: 400,
      bodyLimit: '50mb',
    },
  },
  server: {
    defaultPort: 3000,
    host: '0.0.0.0',
    roomsPersistenceFile: 'rooms_persistence.json',
  },
  ui: {
    mobileBreakpointPx: 1024,
    aiStatusPollIntervalMs: 30000,
    socketSyncDebounceMs: 300,
    autoSaveDebounceMs: 3000,
    fontSizes: STANDARD_FONT_SIZES,
  },
} as const;
