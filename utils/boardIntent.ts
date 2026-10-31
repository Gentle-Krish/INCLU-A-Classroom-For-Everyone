import { STANDARD_FONT_SIZES, resolveFontSize, StandardFontSize } from '../constants';

/** Words the teacher asked the pen to write. Null when the sentence is not a pen request. */
export function penLine(prompt: string): string | null {
  const match = prompt.trim().match(
    /\b(?:use the pen|with the pen|by hand|handwrite)\b(?:\s+to)?(?:\s+write)?\s*[:,]?\s*(.*)$/i,
  );
  if (!match) return null;
  const line = match[1].replace(/^[:\-]\s*/, '').replace(/\s+/g, ' ').trim();
  if (!line) return null;
  return line.slice(0, 6000);
}

/** True when the teacher asked for another blank board page. */
export function isNewPageRequest(text: string): boolean {
  const norm = text.trim().toLowerCase().replace(/[.!?]+$/g, '').replace(/\s+/g, ' ');
  if (/^(?:new page|add page|blank page|halaman baru|tambah halaman|buat halaman baru)$/.test(norm)) return true;
  const match = norm.match(/^(?:open|add|make|create|start|show|buka|tambah|buat(?:kan)?)\s+(?:up\s+)?(?:a\s+|the\s+)?(?:(new|blank)\s+)?(?:whiteboard\s+)?page$/);
  if (!match) return false;
  if (match[1]) return true;
  return /^(?:add|make|create|start|tambah|buat)/.test(norm);
}

/** A pen page should fill the sheet. Short writing grows; a long page stays readable and scrolls. */
export function penFontSize(text: string, pageWidth: number, pageHeight: number): number {
  const letters = Math.max(1, text.trim().length);
  const innerW = Math.max(240, pageWidth - 96);
  const innerH = Math.max(180, pageHeight - 96);
  let size = 52;
  for (let i = 0; i < 16; i++) {
    const perLine = Math.max(8, innerW / (size * 0.52));
    const lines = Math.ceil(letters / perLine);
    const height = lines * size * 1.45;
    if (height > innerH * 0.94) size *= 0.9;
    else if (height < innerH * 0.82) size *= 1.08;
    else break;
  }
  return Math.round(Math.max(26, Math.min(48, size)));
}

/** The equation in the sentence, without dollar signs. Null when none was given. */
export function equationLine(prompt: string): string | null {
  const text = prompt.trim();
  const asked = /\b(equation|formula)\b/i.test(text) || /\b(write|draw|put|show)\b[\s\S]{0,40}=/.test(text);
  if (!asked) return null;
  const latex = text.match(/\$\$?([^$]+)\$\$?/);
  if (latex) {
    const body = latex[1].replace(/\s+/g, ' ').trim();
    return body || null;
  }
  const eq = text.match(
    /([A-Za-z0-9\\^_{}()]+(?:\s*[+\-*/^]\s*[A-Za-z0-9\\^_{}()]+)*\s*=\s*[A-Za-z0-9\\^_{}()+*/.\-]+(?:\s*[+\-*/^]\s*[A-Za-z0-9\\^_{}()+*/.\-]+)*)/,
  );
  if (!eq) return null;
  return eq[1].replace(/\s+/g, ' ').trim();
}

export function equationMarkdown(equation: string): string {
  const body = equation.replace(/\$/g, '').trim();
  return `## Equation\n\n$$${body}$$`;
}

export interface WriteTextIntentResult {
  text: string;
  fontSize: number;
  sizeName: StandardFontSize | 'custom';
}

/**
 * Detects requests for photorealistic artwork, complex paintings (e.g. Mona Lisa),
 * or other capabilities outside an AI whiteboard's educational scope.
 */
export function isUnsupportedDrawingRequest(prompt: string): boolean {
  const norm = prompt.trim().toLowerCase();
  
  const unsupportedPatterns = [
    /\b(?:draw|paint|sketch|lukis|gambarkan|bikin\s+gambar)\s+(?:the\s+|sebuah\s+)?(?:mona\s*lisa|starry\s*night|guernica|the\s+scream|last\s+supper|girl\s+with\s+a\s+pearl\s+earring)\b/i,
    /\b(?:draw|paint|sketch|lukis|gambarkan)\s+(?:a\s+)?(?:realistic|photorealistic|hyperrealistic|photo|portrait\s+of\s+a\s+person|human\s+face)\b/i,
    /\b(?:generate|create|buat|bikin)\s+(?:a\s+)?(?:video|movie|3d\s+model|song|music|mp3|mp4)\b/i,
  ];

  return unsupportedPatterns.some(pattern => pattern.test(norm));
}

/**
 * Parses user commands to write text on the whiteboard, supporting standard sizes
 * ('small', 'medium', 'large') and custom pixel sizes (e.g. 'custom 56px', '56px').
 */
export function writeTextIntent(prompt: string): WriteTextIntentResult | null {
  const trimmed = prompt.trim();
  if (!trimmed) return null;

  // Don't intercept pen handwriting or explicit equation requests
  if (penLine(prompt) || equationLine(prompt)) return null;

  // Check if prompt begins with or contains a command to write text on the board
  const writeTrigger = /^(?:please\s+)?(?:write|tulis|tuliskan|type|put|add\s+text)\b/i;
  if (!writeTrigger.test(trimmed)) return null;

  // Avoid matching long-form composition requests (e.g. "write an essay", "write a story", "write a quiz")
  if (/^(?:please\s+)?(?:write|tulis|tuliskan)\s+(?:an?|the|suatu|sebuah)\s+(?:essay|article|story|lesson|plan|quiz|question|code|program|script|summary|review|explanation)\b/i.test(trimmed)) {
    return null;
  }

  // Remove leading write trigger and optional canvas/whiteboard destination references
  let body = trimmed
    .replace(writeTrigger, '')
    .replace(/^\s*(?:on|to|in|pada|di)?\s*(?:the\s+)?(?:whiteboard|board|canvas|screen|layar|papan(?:\s+tulis)?)\s*[:,]?\s*/i, '')
    .trim();

  if (!body) return null;

  // Strip trailing punctuation (e.g. '.', '!', '?') so it doesn't break regex suffix matching
  let trailingPunctuation = '';
  const punctMatch = body.match(/[.!?]+$/);
  if (punctMatch) {
    trailingPunctuation = punctMatch[0];
    body = body.slice(0, -trailingPunctuation.length).trim();
  }

  let sizeName: StandardFontSize | 'custom' = 'medium';
  let resolvedSize: number = STANDARD_FONT_SIZES.medium.whiteboardPx;

  // Standard size keywords and synonyms:
  // small / kecil / tiny / little
  // large / besar / big / huge / giant
  // medium / sedang / normal / regular
  const sizeKeywords = 'small|medium|large|kecil|sedang|besar|big|huge|giant|tiny|little|normal|regular';

  // 1. Check if size is specified at the START (prefix):
  // e.g. "in large font: Hello Rahul", "in 56px: Hello Rahul", "large font Hello Rahul"
  const prefixCustomPxRegex = /^(?:in|with|ukuran|font|dengan)?\s*(?:custom\s+)?(\d+)\s*px(?:\s*(?:font|size|ukuran|fotn))*\s*[:,\-]?\s*/i;
  const prefixStandardRegex = new RegExp(`^(?:in|with|at|ukuran|dalam|dengan)?\\s*(${sizeKeywords})(?:\\s*(?:size|font|ukuran|fotn))*\\s*[:,\\-]?\\s*`, 'i');

  // 2. Check if size is specified at the END (suffix):
  // e.g. "Hello Rahul in large font", "Hello Rahul in custom 56px", "Hello Rahul 56px"
  const suffixCustomPxRegex = /\s*(?:in|with|at|using|ukuran|font|size|dengan)?\s*(?:custom\s+)?(\d+)\s*px(?:\s*(?:font|size|ukuran|fotn))*$/i;
  const suffixCustomPrefixRegex = /\s*(?:in|with|ukuran|font|dengan)\s+(?:custom\s+)(\d+)(?:\s*px)?(?:\s*(?:font|size|ukuran|fotn))*$/i;
  const suffixStandardRegex = new RegExp(`\\s*(?:in|with|at|ukuran|dalam|dengan)?\\s*(${sizeKeywords})(?:\\s*(?:size|font|ukuran|fotn))*$`, 'i');

  const resolveSizeKeyword = (keyword: string) => {
    const raw = keyword.toLowerCase();
    if (['small', 'kecil', 'tiny', 'little'].includes(raw)) {
      sizeName = 'small';
      resolvedSize = STANDARD_FONT_SIZES.small.whiteboardPx;
    } else if (['large', 'besar', 'big', 'huge', 'giant'].includes(raw)) {
      sizeName = 'large';
      resolvedSize = STANDARD_FONT_SIZES.large.whiteboardPx;
    } else {
      sizeName = 'medium';
      resolvedSize = STANDARD_FONT_SIZES.medium.whiteboardPx;
    }
  };

  if (suffixCustomPrefixRegex.test(body)) {
    const match = body.match(suffixCustomPrefixRegex);
    if (match && match[1]) {
      const px = parseInt(match[1], 10);
      if (!isNaN(px) && px > 0) {
        sizeName = 'custom';
        resolvedSize = Math.max(8, Math.min(200, px));
        body = body.replace(suffixCustomPrefixRegex, '').trim();
      }
    }
  } else if (suffixCustomPxRegex.test(body)) {
    const match = body.match(suffixCustomPxRegex);
    if (match && match[1]) {
      const px = parseInt(match[1], 10);
      if (!isNaN(px) && px > 0) {
        sizeName = 'custom';
        resolvedSize = Math.max(8, Math.min(200, px));
        body = body.replace(suffixCustomPxRegex, '').trim();
      }
    }
  } else if (suffixStandardRegex.test(body)) {
    const match = body.match(suffixStandardRegex);
    if (match && match[1]) {
      resolveSizeKeyword(match[1]);
      body = body.replace(suffixStandardRegex, '').trim();
    }
  } else if (prefixCustomPxRegex.test(body)) {
    const match = body.match(prefixCustomPxRegex);
    if (match && match[1]) {
      const px = parseInt(match[1], 10);
      if (!isNaN(px) && px > 0) {
        sizeName = 'custom';
        resolvedSize = Math.max(8, Math.min(200, px));
        body = body.replace(prefixCustomPxRegex, '').trim();
      }
    }
  } else if (prefixStandardRegex.test(body)) {
    const match = body.match(prefixStandardRegex);
    if (match && match[1]) {
      resolveSizeKeyword(match[1]);
      body = body.replace(prefixStandardRegex, '').trim();
    }
  }

  // Clean up any remaining quotes, colons, or dashes
  body = body.replace(/^[:\-]\s*/, '').replace(/[:;,]+$/, '').trim();
  body = body.replace(/^["'`]+|["'`]+$/g, '').trim();

  if (!body) return null;

  return {
    text: body,
    fontSize: resolvedSize,
    sizeName,
  };
}
