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
  let size = 96;
  for (let i = 0; i < 16; i++) {
    const perLine = Math.max(8, innerW / (size * 0.52));
    const lines = Math.ceil(letters / perLine);
    const height = lines * size * 1.45;
    if (height > innerH * 0.96) size *= 0.9;
    else if (height < innerH * 0.88) size *= 1.08;
    else break;
  }
  return Math.round(Math.max(32, Math.min(96, size)));
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
