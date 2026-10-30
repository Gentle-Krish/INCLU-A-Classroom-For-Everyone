import { CONFIG, CHALK_LOCAL_DOWNLOAD_MODEL } from '../constants';
import { readableStudentAnswer, studentAnswerPrompt } from '../utils/classAnswer';

function localOllamaUrl(): string {
  const fallback = (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_URL || CONFIG.ai.ollama.defaultBaseUrl).replace(/\/$/, '');
  try {
    const parsed = new URL(fallback);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return CONFIG.ai.ollama.defaultBaseUrl;
    return parsed.origin;
  } catch {
    return CONFIG.ai.ollama.defaultBaseUrl;
  }
}

/** Ask the model installed on this laptop. A failure is a sentence the phone can show. */
export async function answerStudent(question: string, notes: string): Promise<string> {
  try {
    const response = await fetch(`${localOllamaUrl()}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CHALK_LOCAL_DOWNLOAD_MODEL,
        messages: [{ role: 'user', content: studentAnswerPrompt(question, notes) }],
        stream: false,
        options: { temperature: 0.3 },
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) return readableStudentAnswer('');
    const data = await response.json() as { message?: { content?: string } };
    return readableStudentAnswer(data.message?.content || '');
  } catch {
    return readableStudentAnswer('');
  }
}
